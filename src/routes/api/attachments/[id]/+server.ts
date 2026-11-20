// Отдача фото с проверкой прав (СТ 6.3, Тр. 1):
//   фото отчёта о работе — всем вошедшим (отчёт виден жителям, ФТ-17.4);
//   фото заявки — администратору, жителям этой квартиры и исполнителю
//   связанной работы (ФТ-18.2).
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { readPhoto } from "#lib/server/uploads.js";
import { id as idSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  const user = checkAuthAccess(locals);
  const id = idSchema.parse(params.id);

  const [a] = await db.execute<{
    file_path: string;
    mime_type: string;
    work_id: number | null;
    apartment_id: number | null;
    executor_ids: number[] | null;
  }>(sql`
    select a.file_path, a.mime_type, a.work_id, r.apartment_id,
           (select array_agg(w.executor_id) from works w where w.request_id = r.id) as executor_ids
    from attachments a left join requests r on r.id = a.request_id
    where a.id = ${id}`);
  if (!a) error(404);

  const allowed =
    a.work_id !== null ||
    user.role === "admin" ||
    (user.role === "resident" && a.apartment_id === user.apartmentId) ||
    (user.role === "executor" && (a.executor_ids ?? []).includes(Number(user.id)));
  if (!allowed) error(403);

  const file = await readPhoto(a.file_path).catch(() => error(404));
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": a.mime_type, "Cache-Control": "private, max-age=86400" },
  });
};
