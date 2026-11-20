// 3.6 Реестр квартир: список (ФТ-6.3) и добавление (ФТ-6.1, 6.2)
import type { ApartmentRow } from "#lib/api/types.js";
import { APARTMENT_CONSTRAINTS, apartmentOrder } from "#lib/server/apartments.js";
import { audit, dbError } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { apartments } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody, parseSearchParams } from "#lib/server/helpers.js";
import { apartmentSchema } from "#lib/schemas.js";
import { ilike, or, sql } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const searchParamsSchema = z.strictObject({ q: z.string().trim().max(20).optional() });

export const GET: RequestHandler = async ({ locals, url }) => {
  checkAuthAccess(locals, ["admin"]);
  const { q } = parseSearchParams(url.searchParams, searchParamsSchema);

  const rows = await db
    .select({
      id: apartments.id,
      number: apartments.number,
      entrance: apartments.entrance,
      floor: apartments.floor,
      area: apartments.area,
      accountNumber: apartments.accountNumber,
      initialCold: apartments.initialCold,
      initialHot: apartments.initialHot,
      // Имя таблицы — явно: Drizzle опускает его в запросе к одной таблице
      residents: sql<ApartmentRow["residents"]>`coalesce((
        select json_agg(json_build_object('id', u.id, 'name', u.full_name, 'status', u.status) order by u.full_name)
        from users u where u.apartment_id = "apartments"."id" and u.status in ('active', 'pending', 'blocked')
      ), '[]'::json)`,
      hasData: sql<boolean>`(
        exists(select 1 from meter_readings r where r.apartment_id = "apartments"."id")
        or exists(select 1 from charges c where c.apartment_id = "apartments"."id")
      )`,
    })
    .from(apartments)
    .where(
      q
        ? or(ilike(apartments.number, `${q}%`), ilike(apartments.accountNumber, `%${q}%`))
        : undefined,
    )
    .orderBy(...apartmentOrder);

  return Response.json(rows satisfies ApartmentRow[]);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const data = await parseRequestBody(request, apartmentSchema);

  try {
    const [created] = await db.insert(apartments).values(data).returning({ id: apartments.id });
    await audit(Number(admin.id), "apartment.create", "apartment", created?.id ?? null, data);
    return Response.json(created, { status: 201 });
  } catch (e) {
    dbError(e, APARTMENT_CONSTRAINTS);
  }
};
