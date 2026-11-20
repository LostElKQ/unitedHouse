// 3.11 Формирование начислений: сводная ведомость (ФТ-11.4, раздел 4.3)
// и (пере)расчёт (ФТ-11.1, 11.2, 11.5, 11.7)
import type { ChargeSummaryRow, PeriodCharges } from "#lib/api/types.js";
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { formCharges, getPeriod, readingsForPeriod, requireStatus } from "#lib/server/billing.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { id as idSchema } from "#lib/schemas.js";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  checkAuthAccess(locals, ["admin"]);
  const period = await getPeriod(idSchema.parse(params.id));

  const rows = await db.execute<{
    charge_id: number;
    apartment_id: number;
    apartment_number: string;
    account_number: string;
    total: string;
    paid_amount: string;
    payment_status: ChargeSummaryRow["paymentStatus"];
  }>(sql`
    select c.id as charge_id, a.id as apartment_id, a.number as apartment_number,
           a.account_number, c.total::text, c.paid_amount::text, c.payment_status
    from charges c join apartments a on a.id = c.apartment_id
    where c.period_id = ${period.id}
    order by coalesce(substring(a.number from '^\\d+')::int, 0), a.number`);

  const byService = await db.execute<{ service: string; amount: string }>(sql`
    select l.service, sum(l.amount)::text as amount
    from charge_lines l join charges c on c.id = l.charge_id
    where c.period_id = ${period.id}
    group by l.service order by min(l.tariff_id)`);

  const [sum] = await db.execute<{ total: string }>(sql`
    select coalesce(sum(total), 0)::text as total from charges where period_id = ${period.id}`);

  const body: PeriodCharges = {
    period,
    rows: rows.map((r) => ({
      chargeId: r.charge_id,
      apartmentId: r.apartment_id,
      apartmentNumber: r.apartment_number,
      accountNumber: r.account_number,
      total: r.total,
      paidAmount: r.paid_amount,
      paymentStatus: r.payment_status,
    })),
    total: sum?.total ?? "0",
    byService: byService.map((s) => ({ service: s.service, amount: s.amount })),
  };
  return Response.json(body);
};

export const POST: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const period = await getPeriod(idSchema.parse(params.id));
  requireStatus(
    period,
    ["readings_closed", "charges_formed"],
    period.status === "readings_open"
      ? "Сначала закройте приём показаний"
      : "Квитанции периода уже опубликованы",
  );

  const missing = (await readingsForPeriod(period.id)).filter((r) => r.cold === null);
  if (missing.length > 0) {
    badRequest({}, [
      `Нет показаний по квартирам: ${missing.map((m) => m.apartmentNumber).join(", ")}`,
    ]);
  }

  const started = Date.now();
  const count = await formCharges(period);
  await audit(Number(admin.id), "charges.form", "billing_period", period.id, {
    apartments: count,
    recalculated: period.status === "charges_formed",
    ms: Date.now() - started,
  });
  return Response.json({ id: period.id, status: "charges_formed", apartments: count });
};
