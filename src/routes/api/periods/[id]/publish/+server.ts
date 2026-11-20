// ФТ-11.6, ФТ-8.4: публикация квитанций — период закрывается,
// данные защищены триггерами БД от изменения.
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
  requireStatus(period, ["charges_formed"], "Сначала сформируйте начисления");

  await db
    .update(billingPeriods)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(billingPeriods.id, period.id), eq(billingPeriods.status, "charges_formed")));
  await audit(Number(admin.id), "charges.publish", "billing_period", period.id);
  return Response.json({ id: period.id, status: "published" });
};
