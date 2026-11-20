// =====================================================================
// Работы по дому (СТ 3.16–3.18): выборки и переходы статусов.
// Статусы (ФТ-16.2): «Запланирована» → «В работе» → «Выполнена»;
// также «Перенесена» и «Отменена». «Просрочена» — вычисляемая отметка
// (ФТ-16.7), в БД не хранится.
// =====================================================================
import type { Attachment, WorkDetail, WorkItem } from "#lib/api/types.js";
import type { WorkStatus } from "#lib/labels.js";
import { error } from "@sveltejs/kit";
import { eq, sql, type SQL } from "drizzle-orm";
import { badRequest } from "./api-helpers.ts";
import type { Session } from "./auth.ts";
import { db } from "./db/index.ts";
import { requests, users } from "./db/schema.ts";

type Viewer = Session["user"];

/** Статусы, из которых работу ещё можно начать, перенести, отменить, выполнить */
export const OPEN_STATUSES: WorkStatus[] = ["planned", "rescheduled", "in_progress"];

type Row = {
  id: number;
  title: string;
  type: WorkItem["type"];
  category: WorkItem["category"];
  location: WorkItem["location"];
  location_detail: string | null;
  entrance: number | null;
  work_date: string;
  time_start: string | null;
  time_end: string | null;
  executor_id: number | null;
  executor_name: string | null;
  contractor: string | null;
  description: string | null;
  priority: WorkItem["priority"];
  status: WorkStatus;
  overdue: boolean;
  request_id: number | null;
  request_number: number | null;
  report: string | null;
  completed_on: string | null;
};

function selectWorks(where: SQL): SQL {
  return sql`
    select w.id, w.title, w.type, w.category, w.location, w.location_detail, w.entrance,
           w.work_date::text, to_char(w.time_start, 'HH24:MI') as time_start,
           to_char(w.time_end, 'HH24:MI') as time_end,
           w.executor_id, u.full_name as executor_name, w.contractor, w.description,
           w.priority, w.status,
           (w.status in ('planned', 'rescheduled', 'in_progress')
             and w.work_date < (now() at time zone coalesce(
               (select timezone from hoa_settings where id = 1), 'Europe/Moscow'))::date) as overdue,
           w.request_id, r.number as request_number, w.report, w.completed_on::text
    from works w
    left join users u on u.id = w.executor_id
    left join requests r on r.id = w.request_id
    where ${where}
    order by w.work_date, w.time_start nulls last, w.id`;
}

function toItem(r: Row): WorkItem {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    category: r.category,
    location: r.location,
    locationDetail: r.location_detail,
    entrance: r.entrance,
    workDate: r.work_date,
    timeStart: r.time_start,
    timeEnd: r.time_end,
    executorId: r.executor_id,
    executorName: r.executor_name,
    contractor: r.contractor,
    description: r.description,
    priority: r.priority,
    status: r.status,
    overdue: r.overdue,
    requestId: r.request_id,
    requestNumber: r.request_number,
  };
}

export type WorkFilters = {
  from: string;
  to: string;
  entrance?: number;
  type?: WorkItem["type"];
  category?: WorkItem["category"];
};

export async function listWorks(viewer: Viewer, f: WorkFilters): Promise<WorkItem[]> {
  const parts: SQL[] = [sql`w.work_date between ${f.from} and ${f.to}`];
  // ФТ-18.1: исполнитель видит только свои работы
  if (viewer.role === "executor") parts.push(sql`w.executor_id = ${Number(viewer.id)}`);
  // ФТ-17.3: подъезд — работы этого подъезда и всего дома, без чужих подъездов
  if (f.entrance) parts.push(sql`(w.location <> 'entrance' or w.entrance = ${f.entrance})`);
  if (f.type) parts.push(sql`w.type = ${f.type}`);
  if (f.category) parts.push(sql`w.category = ${f.category}`);
  const rows = await db.execute<Row>(selectWorks(sql.join(parts, sql` and `)));
  return rows.map(toItem);
}

export async function getWork(id: number, viewer: Viewer): Promise<WorkDetail> {
  const [r] = await db.execute<Row>(selectWorks(sql`w.id = ${id}`));
  if (!r) error(404);
  if (viewer.role === "executor" && r.executor_id !== Number(viewer.id)) error(403);

  const reschedules = await db.execute<{
    old_date: string;
    new_date: string;
    reason: string;
    created_at: string | Date;
  }>(sql`
    select old_date::text, new_date::text, reason, created_at
    from work_reschedules where work_id = ${id} order by created_at`);

  const photos = await db.execute<{ id: number; mime_type: string }>(sql`
    select id, mime_type from attachments where work_id = ${id} order by id`);

  // ФТ-18.2: исполнителю — описание и фото заявки без персональных данных жителя
  const requestPhotos =
    r.request_id && viewer.role !== "resident"
      ? await db.execute<{ id: number; mime_type: string }>(sql`
          select id, mime_type from attachments where request_id = ${r.request_id} order by id`)
      : [];

  const toAtt = (p: { id: number; mime_type: string }): Attachment => ({
    id: p.id,
    url: `/api/attachments/${p.id}`,
    mimeType: p.mime_type,
  });

  return {
    ...toItem(r),
    report: r.report,
    completedOn: r.completed_on,
    reschedules: reschedules.map((x) => ({
      oldDate: x.old_date,
      newDate: x.new_date,
      reason: x.reason,
      createdAt: new Date(x.created_at).toISOString(),
    })),
    photos: photos.map(toAtt),
    requestPhotos: requestPhotos.map(toAtt),
  };
}

export function requireOpen(status: WorkStatus, action: string): void {
  if (!OPEN_STATUSES.includes(status)) {
    badRequest({}, [`Нельзя ${action}: работа ${status === "done" ? "выполнена" : "отменена"}`]);
  }
}

/** Может ли пользователь отмечать начало и выполнение (ФТ-16.5, 18.3, 18.4) */
export function canPerform(viewer: Viewer, executorId: number | null): boolean {
  return (
    viewer.role === "admin" || (viewer.role === "executor" && executorId === Number(viewer.id))
  );
}

/** Общая проверка исполнителя и заявки для создания и изменения работы */
export async function checkLinks(data: { executorId?: number; requestId?: number }): Promise<void> {
  if (data.executorId) {
    const [u] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, data.executorId));
    if (u?.role !== "executor") badRequest({ executorId: ["Выберите исполнителя из списка"] });
  }
  if (data.requestId) {
    const n = await db.$count(requests, eq(requests.id, data.requestId));
    if (!n) badRequest({ requestId: ["Заявка не найдена"] });
  }
}
