// Открытые заявки для привязки к работе (ФТ-16.1) — без персональных данных
import type { OpenRequest } from "#lib/api/types.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  checkAuthAccess(locals, ["admin"]);
  const rows = await db.execute<{
    id: number;
    number: number;
    category: OpenRequest["category"];
    location: OpenRequest["location"];
    location_detail: string | null;
    description: string;
    apartment_number: string;
    priority: OpenRequest["priority"];
  }>(sql`
    select r.id, r.number, r.category, r.location, r.location_detail, r.description,
           a.number as apartment_number, r.priority
    from requests r join apartments a on a.id = r.apartment_id
    where r.status in ('new', 'in_progress')
    order by case r.priority when 'urgent' then 0 when 'normal' then 1 else 2 end, r.created_at`);
  return Response.json(
    rows.map((r) => ({
      id: r.id,
      number: r.number,
      category: r.category,
      location: r.location,
      locationDetail: r.location_detail,
      description: r.description,
      apartmentNumber: r.apartment_number,
      priority: r.priority,
    })) satisfies OpenRequest[],
  );
};
