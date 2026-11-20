// ФТ-16.6: «Копировать» — новая работа с теми же полями на выбранную дату
import { audit } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { works } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { copyWorkSchema, id as idSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const { date } = await parseRequestBody(request, copyWorkSchema);

  const [w] = await db.select().from(works).where(eq(works.id, id));
  if (!w) error(404);

  const [created] = await db
    .insert(works)
    .values({
      title: w.title,
      type: w.type,
      category: w.category,
      location: w.location,
      locationDetail: w.locationDetail,
      entrance: w.entrance,
      workDate: date,
      timeStart: w.timeStart,
      timeEnd: w.timeEnd,
      executorId: w.executorId,
      contractor: w.contractor,
      description: w.description,
      priority: w.priority,
      status: "planned",
      createdBy: Number(admin.id),
    })
    .returning({ id: works.id });
  await audit(Number(admin.id), "work.copy", "work", created?.id ?? null, { from: id, date });
  return Response.json(created, { status: 201 });
};
