// ФТ-16.5, ФТ-18.4: отметка «Выполнена» — комментарий и фактическая дата
// обязательны, до 5 фото «после». Связанная заявка → «Выполнена» (ФТ-15.7).
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { attachments, requestHistory, requests, works } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { fieldsFrom, filesFrom, removePhotos, savePhotos } from "#lib/server/uploads.js";
import { canPerform, getWork, requireOpen } from "#lib/server/works.js";
import { completeWorkSchema, id as idSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { and, eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const user = checkAuthAccess(locals, ["admin", "executor"]);
  const id = idSchema.parse(params.id);
  const w = await getWork(id, user);
  if (!canPerform(user, w.executorId)) error(403);
  requireOpen(w.status, "отметить выполнение");

  const form = await request
    .formData()
    .catch(() => badRequest({}, ["Ожидается multipart/form-data"]));
  const data = completeWorkSchema.parse(fieldsFrom(form));
  const today = new Date().toISOString().slice(0, 10);
  if (data.completedOn > today)
    badRequest({ completedOn: ["Дата не может быть позже сегодняшней"] });

  const existing = w.photos.length;
  const photos = await savePhotos(filesFrom(form), 5 - existing);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(works)
        .set({
          status: "done",
          report: data.report,
          completedOn: data.completedOn,
          completedBy: Number(user.id),
          updatedAt: new Date(),
        })
        .where(eq(works.id, id));
      if (photos.length)
        await tx
          .insert(attachments)
          .values(photos.map((p) => ({ ...p, workId: id, uploadedBy: Number(user.id) })));
      if (w.requestId) {
        const [r] = await tx
          .select({ status: requests.status })
          .from(requests)
          .where(eq(requests.id, w.requestId));
        if (r && (r.status === "new" || r.status === "in_progress")) {
          await tx
            .update(requests)
            .set({ status: "done", closedAt: new Date() })
            .where(
              and(eq(requests.id, w.requestId), inArray(requests.status, ["new", "in_progress"])),
            );
          await tx.insert(requestHistory).values({
            requestId: w.requestId,
            changedBy: Number(user.id),
            oldStatus: r.status,
            newStatus: "done",
          });
        }
      }
      await audit(Number(user.id), "work.complete", "work", id, { photos: photos.length }, tx);
    });
  } catch (e) {
    await removePhotos(photos);
    throw e;
  }
  return Response.json({ id, status: "done" });
};
