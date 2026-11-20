// 3.8 Расчётные периоды: список и открытие (ФТ-8.1)
import type { Period } from "#lib/api/types.js";
import { audit, badRequest, dbError } from "#lib/server/api-helpers.js";
import { latestPeriod, periodColumns } from "#lib/server/billing.js";
import { db } from "#lib/server/db/index.js";
import { billingPeriods } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { periodSchema } from "#lib/schemas.js";
import { desc } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  checkAuthAccess(locals, ["admin"]);
  const rows = await db
    .select(periodColumns)
    .from(billingPeriods)
    .orderBy(desc(billingPeriods.year), desc(billingPeriods.month));
  return Response.json(rows as unknown as Period[]);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const data = await parseRequestBody(request, periodSchema);

  const last = await latestPeriod();
  if (last && last.status !== "published") {
    badRequest({}, [
      "Сначала опубликуйте квитанции текущего периода: открытым может быть только один",
    ]);
  }
  if (last && data.year * 12 + data.month <= last.year * 12 + last.month) {
    badRequest({ month: ["Период должен быть позже последнего"] });
  }

  try {
    const [created] = await db
      .insert(billingPeriods)
      .values({ ...data, status: "readings_open" })
      .returning(periodColumns);
    await audit(Number(admin.id), "period.open", "billing_period", created?.id ?? null, data);
    return Response.json(created, { status: 201 });
  } catch (e) {
    dbError(e, {
      billing_periods_one_open_uq: ["month", "Открытым может быть только один период"],
      billing_periods_year_month_uq: ["month", "Такой период уже есть"],
    });
  }
};
