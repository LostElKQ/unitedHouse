// Карточка работы (ФТ-17.4, 18.2), изменение и удаление (ФТ-16.1, 16.4, 16.8)
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { works } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { checkLinks, getWork, requireOpen } from "#lib/server/works.js";
import { id as idSchema, workSchema } from "#lib/schemas.js";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  const user = checkAuthAccess(locals);
  return Response.json(await getWork(idSchema.parse(params.id), user));
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const current = await getWork(id, admin);
  requireOpen(current.status, "изменить");
  const data = await parseRequestBody(request, workSchema);
  await checkLinks(data);

  // Дата меняется только переносом с причиной (ФТ-16.3), кроме ещё
  // не переносившейся запланированной работы — это исправление опечатки
  if (
    data.workDate !== current.workDate &&
    (current.status !== "planned" || current.reschedules.length)
  ) {
    badRequest({ workDate: ["Чтобы изменить дату, используйте «Перенести» с причиной"] });
  }

  await db
    .update(works)
    .set({
      ...data,
      locationDetail: data.locationDetail ?? null,
      entrance: data.entrance ?? null,
      timeStart: data.timeStart ?? null,
      timeEnd: data.timeEnd ?? null,
      executorId: data.executorId ?? null,
      contractor: data.contractor ?? null,
      description: data.description ?? null,
      priority: data.priority ?? null,
      requestId: data.requestId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(works.id, id));
  await audit(Number(admin.id), "work.update", "work", id, {
    executorFrom: current.executorId,
    executorTo: data.executorId ?? null,
  });
  return Response.json({ id });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const current = await getWork(id, admin);
  if (current.status !== "planned") {
    badRequest({}, ["Удалить можно только запланированную работу — остальные можно отменить"]);
  }
  await db.delete(works).where(eq(works.id, id));
  await audit(Number(admin.id), "work.delete", "work", id, { title: current.title });
  return new Response(null, { status: 204 });
};
