// 3.9 Передача показаний жителем (ФТ-9.1–9.6, ФТ-8.3)
import type { MyReadings } from "#lib/api/types.js";
import { badRequest } from "#lib/server/api-helpers.js";
import {
  checkNotLess,
  currentPeriod,
  latestPeriod,
  readingsForPeriod,
} from "#lib/server/billing.js";
import { db } from "#lib/server/db/index.js";
import { hoaSettings, meterReadings } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { readingSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

type HistoryRow = {
  period_id: number;
  year: number;
  month: number;
  cold: string;
  hot: string;
  cold_usage: string;
  hot_usage: string;
};

function windowFor(
  year: number,
  month: number,
  start: number,
  end: number,
): MyReadings["nextWindow"] {
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-${String(start).padStart(2, "0")}`,
    end: `${year}-${mm}-${String(end).padStart(2, "0")}`,
  };
}

function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

function apartmentOf(user: { apartmentId?: number | null }): number {
  if (!user.apartmentId) error(403);
  return user.apartmentId;
}

export const GET: RequestHandler = async ({ locals }) => {
  const user = checkAuthAccess(locals, ["resident"]);
  const apartmentId = apartmentOf(user);

  const period = await currentPeriod();

  const history = await db.execute<HistoryRow>(sql`
    select bp.id as period_id, bp.year, bp.month,
           r.cold_value::text as cold, r.hot_value::text as hot,
           (r.cold_value - coalesce(lag(r.cold_value) over w, a.initial_cold))::text as cold_usage,
           (r.hot_value - coalesce(lag(r.hot_value) over w, a.initial_hot))::text as hot_usage
    from meter_readings r
    join billing_periods bp on bp.id = r.period_id
    join apartments a on a.id = r.apartment_id
    where r.apartment_id = ${apartmentId}
    window w as (order by bp.year, bp.month)
    order by bp.year desc, bp.month desc`);

  let prev: MyReadings["prev"];
  let current: MyReadings["current"] = null;
  if (period) {
    const [row] = await readingsForPeriod(period.id, apartmentId);
    if (!row) error(404);
    prev = { cold: row.prevCold, hot: row.prevHot };
    if (row.cold !== null && row.hot !== null && row.enteredAt)
      current = {
        cold: row.cold,
        hot: row.hot,
        enteredAt: row.enteredAt,
        enteredByAdmin: row.enteredByAdmin,
      };
  } else {
    const last = history[0];
    const [a] = await db.execute<{ cold: string; hot: string }>(
      sql`select initial_cold::text as cold, initial_hot::text as hot from apartments where id = ${apartmentId}`,
    );
    prev = last ? { cold: last.cold, hot: last.hot } : { cold: a?.cold ?? "0", hot: a?.hot ?? "0" };
  }

  // ФТ-9.4: средний расход за последние 3 месяца до текущего периода
  const past = history.filter((h) => h.period_id !== period?.id).slice(0, 3);
  const avg = (key: "cold_usage" | "hot_usage"): string =>
    (past.reduce((s, h) => s + Number(h[key]), 0) / past.length).toFixed(3);
  const avgUsage = past.length > 0 ? { cold: avg("cold_usage"), hot: avg("hot_usage") } : null;

  // ФТ-9.2: даты следующего приёма
  const [s] = await db
    .select({ start: hoaSettings.readingsStartDay, end: hoaSettings.readingsEndDay })
    .from(hoaSettings);
  const startDay = s?.start ?? 20;
  const endDay = s?.end ?? 25;
  let nextWindow: MyReadings["nextWindow"];
  if (period?.status === "readings_open") {
    nextWindow = { start: period.readingsStart, end: period.readingsEnd };
  } else {
    const base = period ?? (await latestPeriod());
    const now = new Date();
    const [y, m] = base
      ? nextMonth(base.year, base.month)
      : now.getDate() <= endDay
        ? [now.getFullYear(), now.getMonth() + 1]
        : nextMonth(now.getFullYear(), now.getMonth() + 1);
    nextWindow = windowFor(y, m, startDay, endDay);
  }

  const body: MyReadings = {
    period,
    canSubmit: period?.status === "readings_open",
    prev,
    current,
    avgUsage,
    nextWindow,
    history: history.map((h) => ({
      year: h.year,
      month: h.month,
      cold: h.cold,
      hot: h.hot,
      coldUsage: h.cold_usage,
      hotUsage: h.hot_usage,
    })),
  };
  return Response.json(body);
};

export const PUT: RequestHandler = async ({ locals, request }) => {
  const user = checkAuthAccess(locals, ["resident"]);
  const apartmentId = apartmentOf(user);

  const period = await currentPeriod();
  if (period?.status !== "readings_open") {
    badRequest({}, ["Приём показаний закрыт"]);
  }
  const data = await parseRequestBody(request, readingSchema);

  const [row] = await readingsForPeriod(period.id, apartmentId);
  if (!row) error(404);
  checkNotLess(data, row);

  const values = {
    apartmentId,
    periodId: period.id,
    coldValue: data.cold,
    hotValue: data.hot,
    enteredBy: Number(user.id),
    enteredByAdmin: false,
    enteredAt: new Date(),
  };
  await db
    .insert(meterReadings)
    .values(values)
    .onConflictDoUpdate({
      target: [meterReadings.apartmentId, meterReadings.periodId],
      set: values,
    });

  return Response.json({ cold: data.cold, hot: data.hot });
};
