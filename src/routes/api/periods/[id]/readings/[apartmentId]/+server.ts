// ФТ-10.3, 10.4: ввод и исправление показаний администратором
// до формирования начислений, с отметкой «Внесено администратором».
import { audit } from "#lib/server/api-helpers.js";
import { checkNotLess, getPeriod, readingsForPeriod, requireStatus } from "#lib/server/billing.js";
import { db } from "#lib/server/db/index.js";
import { meterReadings } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { id as idSchema, readingSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const period = await getPeriod(idSchema.parse(params.id));
  const apartmentId = idSchema.parse(params.apartmentId);
  requireStatus(
    period,
    ["readings_open", "readings_closed"],
    "Показания можно вносить только до формирования начислений",
  );
  const data = await parseRequestBody(request, readingSchema);

  const [row] = await readingsForPeriod(period.id, apartmentId);
  if (!row) error(404);
  checkNotLess(data, row);

  const values = {
    apartmentId,
    periodId: period.id,
    coldValue: data.cold,
    hotValue: data.hot,
    enteredBy: Number(admin.id),
    enteredByAdmin: true,
    enteredAt: new Date(),
  };
  await db
    .insert(meterReadings)
    .values(values)
    .onConflictDoUpdate({
      target: [meterReadings.apartmentId, meterReadings.periodId],
      set: values,
    });

  await audit(Number(admin.id), "readings.admin_enter", "apartment", apartmentId, {
    periodId: period.id,
    before: row.cold === null ? null : { cold: row.cold, hot: row.hot },
    after: data,
  });
  return Response.json({ apartmentId, cold: data.cold, hot: data.hot });
};
