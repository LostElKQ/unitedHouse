// 3.7 Тарифы: список и создание (ФТ-7.1–7.4)
import type { TariffRow } from "#lib/api/types.js";
import { audit, dbError } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { tariffs } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { TARIFF_CONSTRAINTS } from "#lib/server/tariffs.js";
import { tariffSchema } from "#lib/schemas.js";
import { asc, sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  checkAuthAccess(locals, ["admin"]);

  const rows = await db
    .select({
      id: tariffs.id,
      service: tariffs.service,
      calcMethod: tariffs.calcMethod,
      rate: tariffs.rate,
      validFrom: tariffs.validFrom,
      validTo: tariffs.validTo,
      used: sql<boolean>`exists(select 1 from charge_lines l where l.tariff_id = ${tariffs.id})`,
    })
    .from(tariffs)
    .orderBy(asc(tariffs.id));

  return Response.json(rows satisfies TariffRow[]);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const data = await parseRequestBody(request, tariffSchema);

  try {
    const [created] = await db
      .insert(tariffs)
      .values({ ...data, validTo: data.validTo ?? null })
      .returning({ id: tariffs.id });
    await audit(Number(admin.id), "tariff.create", "tariff", created?.id ?? null, data);
    return Response.json(created, { status: 201 });
  } catch (e) {
    dbError(e, TARIFF_CONSTRAINTS);
  }
};
