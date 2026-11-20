// 3.16 / 3.17: график работ — список за период (все роли) и создание (админ)
import type { WorkItem } from "#lib/api/types.js";
import { audit } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { requestHistory, requests, works } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody, parseSearchParams } from "#lib/server/helpers.js";
import { checkLinks, listWorks } from "#lib/server/works.js";
import { categorySchema, isoDate, workSchema } from "#lib/schemas.js";
import { and, eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const searchSchema = z
  .strictObject({
    from: isoDate,
    to: isoDate,
    entrance: z.coerce.number().int().min(1).optional(),
    type: z.enum(["planned", "unplanned"]).optional(),
    category: categorySchema.optional(),
  })
  .refine((f) => f.to >= f.from, { path: ["to"], message: "Конец периода раньше начала" })
  .refine((f) => (Date.parse(f.to) - Date.parse(f.from)) / 86_400_000 <= 92, {
    path: ["to"],
    message: "Не больше 3 месяцев за запрос",
  });

export const GET: RequestHandler = async ({ locals, url }) => {
  const user = checkAuthAccess(locals);
  const filters = parseSearchParams(url.searchParams, searchSchema);
  return Response.json((await listWorks(user, filters)) satisfies WorkItem[]);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const data = await parseRequestBody(request, workSchema);
  await checkLinks(data);

  const created = await db.transaction(async (tx) => {
    const [w] = await tx
      .insert(works)
      .values({
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
        status: "planned",
        createdBy: Number(admin.id),
      })
      .returning({ id: works.id });
    if (!w) throw new Error("insert failed");

    // ФТ-15.6: заявка, по которой запланирована работа, — «В работе»
    if (data.requestId) {
      const [r] = await tx
        .update(requests)
        .set({ status: "in_progress", takenAt: new Date() })
        .where(and(eq(requests.id, data.requestId), eq(requests.status, "new")))
        .returning({ id: requests.id });
      if (r)
        await tx.insert(requestHistory).values({
          requestId: r.id,
          changedBy: Number(admin.id),
          oldStatus: "new",
          newStatus: "in_progress",
        });
    }
    await audit(Number(admin.id), "work.create", "work", w.id, { title: data.title }, tx);
    return w;
  });
  return Response.json(created, { status: 201 });
};
