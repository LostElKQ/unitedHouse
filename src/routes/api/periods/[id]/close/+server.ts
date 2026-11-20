// ФТ-8.2: «Закрыть приём показаний»
import { audit } from "#lib/server/api-helpers.js";
import { getPeriod, requireStatus } from "#lib/server/billing.js";
import { db } from "#lib/server/db/index.js";
import { billingPeriods } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { id as idSchema } from "#lib/schemas.js";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const period = await getPeriod(idSchema.parse(params.id));
  requireStatus(period, ["readings_open"], "Приём показаний уже закрыт");

  await db
    .update(billingPeriods)
    .set({ status: "readings_closed", closedAt: new Date() })
    .where(and(eq(billingPeriods.id, period.id), eq(billingPeriods.status, "readings_open")));
  await audit(Number(admin.id), "period.close", "billing_period", period.id);
  return Response.json({ id: period.id, status: "readings_closed" });
};
