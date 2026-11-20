// 3.6: изменение (ФТ-6.4) и удаление (ФТ-6.5) квартиры
import { APARTMENT_CONSTRAINTS } from "#lib/server/apartments.js";
import { audit, badRequest, dbError } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { apartments, charges, meterReadings, users } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { apartmentSchema, id as idSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const data = await parseRequestBody(request, apartmentSchema);

  const [current] = await db.select().from(apartments).where(eq(apartments.id, id));
  if (!current) error(404);

  // Начальные показания — «предыдущие» для первого периода (ФТ-6.2).
  // Если показания уже есть, их изменение исказило бы расход.
  const initialChanged =
    Number(current.initialCold) !== Number(data.initialCold) ||
    Number(current.initialHot) !== Number(data.initialHot);
  if (initialChanged && (await db.$count(meterReadings, eq(meterReadings.apartmentId, id))) > 0) {
    badRequest({
      initialCold: ["Нельзя изменить: по квартире уже переданы показания"],
    });
  }

  try {
    await db.update(apartments).set(data).where(eq(apartments.id, id));
  } catch (e) {
    dbError(e, APARTMENT_CONSTRAINTS);
  }
  await audit(Number(admin.id), "apartment.update", "apartment", id, data);
  return Response.json({ id });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);

  const [current] = await db
    .select({ number: apartments.number })
    .from(apartments)
    .where(eq(apartments.id, id));
  if (!current) error(404);

  if (
    (await db.$count(meterReadings, eq(meterReadings.apartmentId, id))) > 0 ||
    (await db.$count(charges, eq(charges.apartmentId, id))) > 0
  ) {
    badRequest({}, ["Квартиру нельзя удалить: по ней есть показания или начисления"]);
  }
  if ((await db.$count(users, eq(users.apartmentId, id))) > 0) {
    badRequest({}, ["Квартиру нельзя удалить: к ней привязаны жители"]);
  }

  await db.delete(apartments).where(eq(apartments.id, id));
  await audit(Number(admin.id), "apartment.delete", "apartment", id, { number: current.number });
  return new Response(null, { status: 204 });
};
