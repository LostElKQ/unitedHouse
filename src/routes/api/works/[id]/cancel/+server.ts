// ФТ-16.2, 16.8: отмена работы (вместо удаления, если она уже не «Запланирована»)
import { audit } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { works } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { getWork, requireOpen } from "#lib/server/works.js";
import { id as idSchema } from "#lib/schemas.js";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const w = await getWork(id, admin);
  requireOpen(w.status, "отменить");
  await db
    .update(works)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(works.id, id));
  await audit(Number(admin.id), "work.cancel", "work", id, { from: w.status });
  return Response.json({ id, status: "cancelled" });
};
