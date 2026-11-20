// =====================================================================
// Расчётный период, показания и начисления (СТ 3.8–3.11).
// Расчёт делается одним набором SQL-запросов в транзакции (ФТ-11.7):
// numeric в PostgreSQL не теряет копейки, а round() округляет
// математически (ФТ-11.2).
// =====================================================================
import type { Period, ReadingRow } from "#lib/api/types.js";
import { error } from "@sveltejs/kit";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { badRequest } from "./api-helpers.ts";
import { db } from "./db/index.ts";
import { billingPeriods } from "./db/schema.ts";

export const periodColumns = {
  id: billingPeriods.id,
  year: billingPeriods.year,
  month: billingPeriods.month,
  readingsStart: billingPeriods.readingsStart,
  readingsEnd: billingPeriods.readingsEnd,
  status: billingPeriods.status,
  openedAt: billingPeriods.openedAt,
  closedAt: billingPeriods.closedAt,
  chargesFormedAt: billingPeriods.chargesFormedAt,
  publishedAt: billingPeriods.publishedAt,
};

export async function getPeriod(id: number): Promise<Period> {
  const [p] = await db.select(periodColumns).from(billingPeriods).where(eq(billingPeriods.id, id));
  if (!p) error(404);
  return p as unknown as Period;
}

/** Текущий период — единственный неопубликованный (см. billing_periods_one_open_uq) */
export async function currentPeriod(): Promise<Period | null> {
  const [p] = await db
    .select(periodColumns)
    .from(billingPeriods)
    .where(ne(billingPeriods.status, "published"))
    .orderBy(desc(billingPeriods.year), desc(billingPeriods.month))
    .limit(1);
  return (p as unknown as Period | undefined) ?? null;
}

export async function latestPeriod(): Promise<Period | null> {
  const [p] = await db
    .select(periodColumns)
    .from(billingPeriods)
    .orderBy(desc(billingPeriods.year), desc(billingPeriods.month))
    .limit(1);
  return (p as unknown as Period | undefined) ?? null;
}

export function requireStatus(period: Period, allowed: Array<Period["status"]>, msg: string): void {
  if (!allowed.includes(period.status)) badRequest({}, [msg]);
}

/**
 * Предыдущие показания квартир для периода: показания последнего более
 * раннего периода, а если их нет — начальные показания квартиры (ФТ-6.2).
 */
const prevJoin = (periodId: number): ReturnType<typeof sql> => sql`
  left join lateral (
    select mr.cold_value, mr.hot_value
    from meter_readings mr
    join billing_periods bp on bp.id = mr.period_id
    where mr.apartment_id = a.id
      and (bp.year, bp.month) < (select year, month from billing_periods where id = ${periodId})
    order by bp.year desc, bp.month desc
    limit 1
  ) prev on true`;

const naturalOrder = sql`coalesce(substring(a.number from '^\\d+')::int, 0), a.number`;

type RawReadingRow = {
  apartment_id: number;
  apartment_number: string;
  account_number: string;
  prev_cold: string;
  prev_hot: string;
  cold: string | null;
  hot: string | null;
  entered_by_name: string | null;
  entered_by_admin: boolean | null;
  entered_at: string | Date | null;
};

function sub(a: string | null, b: string): string | null {
  if (a === null) return null;
  // строки numeric(12,3): считаем в тысячных, чтобы не было ошибок float
  const thousandths = Math.round(Number(a) * 1000) - Math.round(Number(b) * 1000);
  return (thousandths / 1000).toFixed(3);
}

/** Таблица показаний периода (ФТ-10.1) или одной квартиры */
export async function readingsForPeriod(
  periodId: number,
  apartmentId?: number,
): Promise<ReadingRow[]> {
  const rows = await db.execute<RawReadingRow>(sql`
    select a.id as apartment_id, a.number as apartment_number, a.account_number,
           coalesce(prev.cold_value, a.initial_cold)::text as prev_cold,
           coalesce(prev.hot_value, a.initial_hot)::text as prev_hot,
           r.cold_value::text as cold, r.hot_value::text as hot,
           u.full_name as entered_by_name, r.entered_by_admin, r.entered_at
    from apartments a
    left join meter_readings r on r.apartment_id = a.id and r.period_id = ${periodId}
    left join users u on u.id = r.entered_by
    ${prevJoin(periodId)}
    ${apartmentId ? sql`where a.id = ${apartmentId}` : sql``}
    order by ${naturalOrder}
  `);

  return rows.map((r) => ({
    apartmentId: r.apartment_id,
    apartmentNumber: r.apartment_number,
    accountNumber: r.account_number,
    prevCold: r.prev_cold,
    prevHot: r.prev_hot,
    cold: r.cold,
    hot: r.hot,
    coldUsage: sub(r.cold, r.prev_cold),
    hotUsage: sub(r.hot, r.prev_hot),
    enteredByName: r.entered_by_name,
    enteredByAdmin: Boolean(r.entered_by_admin),
    enteredAt: r.entered_at ? new Date(r.entered_at).toISOString() : null,
  }));
}

/** ФТ-9.3, ФТ-10.4: текущее показание не меньше предыдущего */
export function checkNotLess(
  input: { cold: string; hot: string },
  prev: { prevCold: string; prevHot: string },
): void {
  const errors: Record<string, string[]> = {};
  const fmt = (v: string): string => Number(v).toFixed(3).replace(".", ",");
  if (Number(input.cold) < Number(prev.prevCold))
    errors["cold"] = [`Не может быть меньше предыдущего показания (${fmt(prev.prevCold)})`];
  if (Number(input.hot) < Number(prev.prevHot))
    errors["hot"] = [`Не может быть меньше предыдущего показания (${fmt(prev.prevHot)})`];
  if (Object.keys(errors).length) badRequest(errors);
}

/** Срок оплаты — 15-е число месяца, следующего за расчётным (ФТ-11.6) */
export function dueDateFor(year: number, month: number): string {
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return `${y}-${String(m).padStart(2, "0")}-15`;
}

export function lastDayOf(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().slice(0, 10);
}

/**
 * ФТ-11.2, 11.3, 11.5, 11.7: (пере)расчёт начислений периода в одной
 * транзакции. Предыдущий расчёт периода заменяется.
 * Возвращает число квартир.
 */
export async function formCharges(period: Period): Promise<number> {
  const lastDay = lastDayOf(period.year, period.month);
  const due = dueDateFor(period.year, period.month);

  return db.transaction(async (tx) => {
    const tariffCount = await tx.execute<{ n: number }>(sql`
      select count(*)::int as n from tariffs
      where valid_from <= ${lastDay} and (valid_to is null or valid_to >= ${lastDay})`);
    if (!tariffCount[0]?.n) {
      badRequest({}, ["Нет тарифов, действующих на последний день месяца"]);
    }

    await tx.execute(sql`delete from charges where period_id = ${period.id}`);

    const created = await tx.execute<{ id: number }>(sql`
      insert into charges (apartment_id, period_id, total, due_date)
      select a.id, ${period.id}, 0, ${due} from apartments a
      returning id`);

    // ФТ-7.4: тариф, действующий на последний день расчётного месяца.
    // Порядок строк — порядок создания тарифов (раздел 4.3).
    await tx.execute(sql`
      insert into charge_lines (charge_id, tariff_id, service, calc_method, volume, unit, rate, amount, sort_order)
      select c.id, t.id, t.service, t.calc_method, v.volume, v.unit, t.rate,
             round(v.volume * t.rate, 2), row_number() over (partition by c.id order by t.id)
      from charges c
      join apartments a on a.id = c.apartment_id
      join meter_readings r on r.apartment_id = a.id and r.period_id = c.period_id
      ${prevJoin(period.id)}
      join tariffs t on t.valid_from <= ${lastDay} and (t.valid_to is null or t.valid_to >= ${lastDay})
      cross join lateral (
        select case t.calc_method
                 when 'area' then a.area
                 when 'cold_water' then r.cold_value - coalesce(prev.cold_value, a.initial_cold)
                 when 'hot_water' then r.hot_value - coalesce(prev.hot_value, a.initial_hot)
                 else 1 end as volume,
               case t.calc_method
                 when 'area' then 'м²'
                 when 'fixed' then 'шт.'
                 else 'м³' end as unit
      ) v
      where c.period_id = ${period.id}`);

    await tx.execute(sql`
      update charges c set total = coalesce(
        (select sum(l.amount) from charge_lines l where l.charge_id = c.id), 0)
      where c.period_id = ${period.id}`);

    await tx
      .update(billingPeriods)
      .set({ status: "charges_formed", chargesFormedAt: new Date() })
      .where(and(eq(billingPeriods.id, period.id)));

    return created.length;
  });
}
