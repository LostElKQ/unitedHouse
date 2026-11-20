// =====================================================================
// Квитанции (СТ 3.12): данные для просмотра и PDF.
// ФТ-12.4: житель видит только опубликованные квитанции своей квартиры —
// проверка здесь, на сервере, при каждом запросе.
// =====================================================================
import type { Receipt, ReceiptListItem } from "#lib/api/types.js";
import { error } from "@sveltejs/kit";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import { sql } from "drizzle-orm";
import { db } from "./db/index.ts";
import type { Session } from "./auth.ts";

type Viewer = Session["user"];

type ReceiptRow = {
  id: number;
  year: number;
  month: number;
  total: string;
  due_date: string;
  payment_status: Receipt["paymentStatus"];
  paid_amount: string;
  period_status: string;
  apartment_id: number;
  number: string;
  account_number: string;
  area: string;
};

export async function listMyReceipts(apartmentId: number): Promise<ReceiptListItem[]> {
  const rows = await db.execute<ReceiptRow>(sql`
    select c.id, p.year, p.month, c.total::text, c.due_date::text, c.payment_status, c.paid_amount::text
    from charges c join billing_periods p on p.id = c.period_id
    where c.apartment_id = ${apartmentId} and p.status = 'published'
    order by p.year desc, p.month desc`);
  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    month: r.month,
    total: r.total,
    dueDate: r.due_date,
    paymentStatus: r.payment_status,
    paidAmount: r.paid_amount,
  }));
}

export async function getReceipt(id: number, viewer: Viewer): Promise<Receipt> {
  const [r] = await db.execute<ReceiptRow>(sql`
    select c.id, p.year, p.month, c.total::text, c.due_date::text, c.payment_status,
           c.paid_amount::text, p.status as period_status,
           a.id as apartment_id, a.number, a.account_number, a.area::text
    from charges c
    join billing_periods p on p.id = c.period_id
    join apartments a on a.id = c.apartment_id
    where c.id = ${id}`);
  if (!r) error(404);

  const published = r.period_status === "published";
  if (viewer.role !== "admin") {
    // ФТ-12.4: чужая квартира или неопубликованная квитанция — нет доступа
    if (viewer.apartmentId !== r.apartment_id || !published) error(403);
  }

  const lines = await db.execute<{
    service: string;
    calc_method: Receipt["lines"][number]["calcMethod"];
    volume: string;
    unit: string;
    rate: string;
    amount: string;
  }>(sql`
    select service, calc_method, volume::text, unit, rate::text, amount::text
    from charge_lines where charge_id = ${id} order by sort_order, id`);

  const payers = await db.execute<{ name: string }>(sql`
    select full_name as name from users
    where apartment_id = ${r.apartment_id} and status = 'active' and role in ('resident', 'admin')
    order by created_at, id`);

  const [hoa] = await db.execute<
    Receipt["hoa"] & {
      bank_account: string | null;
      bank_name: string | null;
      corr_account: string | null;
    }
  >(sql`
    select name, inn, kpp, address, bank_account, bank_name, bik, corr_account from hoa_settings where id = 1`);

  return {
    id: r.id,
    year: r.year,
    month: r.month,
    total: r.total,
    dueDate: r.due_date,
    paymentStatus: r.payment_status,
    paidAmount: r.paid_amount,
    published,
    apartment: { number: r.number, accountNumber: r.account_number, area: r.area },
    payerNames: payers.map((p) => p.name),
    lines: lines.map((l) => ({
      service: l.service,
      calcMethod: l.calc_method,
      volume: l.volume,
      unit: l.unit,
      rate: l.rate,
      amount: l.amount,
    })),
    hoa: {
      name: hoa?.name ?? "",
      inn: hoa?.inn ?? null,
      kpp: hoa?.kpp ?? null,
      address: hoa?.address ?? "",
      bankAccount: hoa?.bank_account ?? null,
      bankName: hoa?.bank_name ?? null,
      bik: hoa?.bik ?? null,
      corrAccount: hoa?.corr_account ?? null,
    },
  };
}

/** ФТ-12.3: kvitanciya_<лицевой счёт>_<ГГГГ-ММ>.pdf */
export function receiptFileName(r: Receipt): string {
  return `kvitanciya_${r.apartment.accountNumber}_${r.year}-${String(r.month).padStart(2, "0")}.pdf`;
}

// --- PDF ------------------------------------------------------------------

const require = createRequire(import.meta.url);
const FONT_REGULAR = require.resolve("@ibm/plex-sans/fonts/complete/woff/IBMPlexSans-Regular.woff");
const FONT_BOLD = require.resolve("@ibm/plex-sans/fonts/complete/woff/IBMPlexSans-SemiBold.woff");

const MONTHS_GENITIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

const num = (v: string | number, digits: number): string =>
  new Intl.NumberFormat("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    .format(Number(v))
    .replace(/\s/g, " ");
const money = (v: string | number): string => `${num(v, 2)} ₽`;
const date = (iso: string): string => iso.split("-").reverse().join(".");

/**
 * Упрощённая форма платёжного документа (приказ Минстроя № 43/пр, раздел 4.3):
 * реквизиты ТСЖ, плательщик, лицевой счёт, площадь, период, строки
 * начислений, итог и срок оплаты.
 */
export function renderReceiptPdf(r: Receipt): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: receiptFileName(r) } });
  doc.registerFont("regular", FONT_REGULAR);
  doc.registerFont("bold", FONT_BOLD);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done: Promise<Buffer> = new Promise((ok) => doc.on("end", () => ok(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const period = `${MONTHS_GENITIVE[r.month - 1]} ${r.year} г.`;

  doc
    .font("bold")
    .fontSize(14)
    .text(`Платёжный документ (квитанция) за ${period}`, { align: "left" });
  doc.moveDown(0.8);

  const block = (title: string, rows: Array<[string, string | null]>): void => {
    doc.font("bold").fontSize(10).text(title.toUpperCase());
    doc.moveDown(0.2);
    for (const [k, v] of rows) {
      if (!v) continue;
      doc.font("regular").fontSize(10).fillColor("#6B6F6D").text(`${k}: `, { continued: true });
      doc.fillColor("#000000").text(v);
    }
    doc.moveDown(0.6);
  };

  block("Получатель платежа", [
    ["Наименование", r.hoa.name],
    ["ИНН / КПП", [r.hoa.inn, r.hoa.kpp].filter(Boolean).join(" / ") || null],
    ["Адрес", r.hoa.address],
    ["Расчётный счёт", r.hoa.bankAccount],
    ["Банк", r.hoa.bankName],
    ["БИК", r.hoa.bik],
    ["Корр. счёт", r.hoa.corrAccount],
  ]);

  block("Плательщик", [
    ["ФИО", r.payerNames.join(", ") || "—"],
    ["Адрес", `${r.hoa.address}, кв. ${r.apartment.number}`],
    ["Лицевой счёт", r.apartment.accountNumber],
    ["Общая площадь", `${num(r.apartment.area, 2)} м²`],
    ["Расчётный период", period],
  ]);

  // Таблица начислений
  const cols = [
    { title: "Услуга", w: 0.34, align: "left" as const },
    { title: "Объём", w: 0.15, align: "right" as const },
    { title: "Ед.", w: 0.08, align: "left" as const },
    { title: "Тариф, ₽", w: 0.18, align: "right" as const },
    { title: "Сумма, ₽", w: 0.25, align: "right" as const },
  ];
  const drawRow = (cells: string[], font: "regular" | "bold"): void => {
    const y = doc.y;
    let x = left;
    let h = 0;
    doc.font(font).fontSize(10);
    cells.forEach((cell, i) => {
      const col = cols[i]!;
      const w = col.w * width;
      doc.text(cell, x + 4, y + 4, { width: w - 8, align: col.align });
      h = Math.max(h, doc.y - y + 4);
      x += w;
    });
    doc
      .moveTo(left, y + h)
      .lineTo(left + width, y + h)
      .strokeColor("#DADDD8")
      .lineWidth(0.5)
      .stroke();
    doc.x = left;
    doc.y = y + h;
  };

  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor("#2B2F2E")
    .lineWidth(1)
    .stroke();
  drawRow(
    cols.map((c) => c.title),
    "bold",
  );
  for (const l of r.lines) {
    drawRow(
      [
        l.service,
        num(l.volume, l.unit === "м³" ? 3 : l.unit === "м²" ? 2 : 0),
        l.unit,
        num(l.rate, 2),
        num(l.amount, 2),
      ],
      "regular",
    );
  }

  doc.moveDown(0.8);
  doc
    .font("bold")
    .fontSize(13)
    .text(`Итого к оплате: ${money(r.total)}`, left, doc.y, { width, align: "right" });
  doc
    .font("regular")
    .fontSize(11)
    .text(`Срок оплаты: до ${date(r.dueDate)}`, left, doc.y, { width, align: "right" });
  doc.moveDown(1.5);
  doc
    .fontSize(9)
    .fillColor("#6B6F6D")
    .text(
      "Оплата по реквизитам получателя через банк. В назначении платежа укажите лицевой счёт и расчётный период.",
      left,
      doc.y,
      { width },
    );

  doc.end();
  return done;
}
