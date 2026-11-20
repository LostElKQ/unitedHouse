// ФТ-16.3: перенос — новая дата и причина обязательны, история сохраняется
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { workReschedules, works } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { getWork, requireOpen } from "#lib/server/works.js";
import { id as idSchema, rescheduleSchema } from "#lib/schemas.js";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const w = await getWork(id, admin);
  requireOpen(w.status, "перенести");
  const data = await parseRequestBody(request, rescheduleSchema);
  if (data.newDate === w.workDate) badRequest({ newDate: ["Новая дата совпадает с текущей"] });

  await db.transaction(async (tx) => {
    await tx.insert(workReschedules).values({
      workId: id,
      oldDate: w.workDate,
      newDate: data.newDate,
      reason: data.reason,
      createdBy: Number(admin.id),
    });
    await tx
      .update(works)
      .set({ workDate: data.newDate, status: "rescheduled", updatedAt: new Date() })
      .where(eq(works.id, id));
    await audit(Number(admin.id), "work.reschedule", "work", id, { from: w.workDate, ...data }, tx);
  });
  return Response.json({ id, status: "rescheduled", workDate: data.newDate });
};
