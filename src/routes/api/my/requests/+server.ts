// 3.14 Заявки жителя: список (ФТ-14.8) и создание (ФТ-14.1–14.7)
import type { Attachment, RequestItem } from "#lib/api/types.js";
import { badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { attachments, requestHistory, requests } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { fieldsFrom, filesFrom, removePhotos, savePhotos } from "#lib/server/uploads.js";
import { requestSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

type Row = {
  id: number;
  number: number;
  category: RequestItem["category"];
  location: RequestItem["location"];
  location_detail: string | null;
  description: string;
  marked_urgent: boolean;
  priority: RequestItem["priority"];
  status: RequestItem["status"];
  created_at: string | Date;
  planned_date: string | null;
  photos: Array<{ id: number; mime_type: string }> | null;
};

export const GET: RequestHandler = async ({ locals }) => {
  const user = checkAuthAccess(locals, ["resident"]);
  if (!user.apartmentId) error(403);

  const rows = await db.execute<Row>(sql`
    select r.id, r.number, r.category, r.location, r.location_detail, r.description,
           r.marked_urgent, r.priority, r.status, r.created_at,
           (select w.work_date::text from works w
             where w.request_id = r.id and w.status <> 'cancelled'
             order by w.work_date desc limit 1) as planned_date,
           (select json_agg(json_build_object('id', a.id, 'mime_type', a.mime_type) order by a.id)
              from attachments a where a.request_id = r.id) as photos
    from requests r
    where r.apartment_id = ${user.apartmentId}
    order by r.created_at desc`);

  const body: RequestItem[] = rows.map((r) => ({
    id: r.id,
    number: r.number,
    category: r.category,
    location: r.location,
    locationDetail: r.location_detail,
    description: r.description,
    markedUrgent: r.marked_urgent,
    priority: r.priority,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    plannedDate: r.planned_date,
    photos: (r.photos ?? []).map((p): Attachment => ({
      id: p.id,
      url: `/api/attachments/${p.id}`,
      mimeType: p.mime_type,
    })),
  }));
  return Response.json(body);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = checkAuthAccess(locals, ["resident"]);
  if (!user.apartmentId) error(403);

  const form = await request
    .formData()
    .catch(() => badRequest({}, ["Ожидается multipart/form-data"]));
  const data = requestSchema.parse(fieldsFrom(form));
  const photos = await savePhotos(filesFrom(form), 3);

  try {
    const created = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(requests)
        .values({
          apartmentId: user.apartmentId!,
          authorId: Number(user.id),
          category: data.category,
          location: data.location,
          locationDetail: data.locationDetail ?? null,
          description: data.description,
          markedUrgent: data.urgent,
          // ФТ-15.2: по умолчанию «Обычный», для отметки «Срочно» — «Срочный»
          priority: data.urgent ? "urgent" : "normal",
        })
        .returning({ id: requests.id, number: requests.number });
      if (!r) throw new Error("insert failed");
      await tx.insert(requestHistory).values({
        requestId: r.id,
        changedBy: Number(user.id),
        newStatus: "new",
        newPriority: data.urgent ? "urgent" : "normal",
      });
      if (photos.length)
        await tx
          .insert(attachments)
          .values(photos.map((p) => ({ ...p, requestId: r.id, uploadedBy: Number(user.id) })));
      return r;
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    await removePhotos(photos);
    throw e;
  }
};
