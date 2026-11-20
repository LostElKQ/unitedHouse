// 3.7: изменение и удаление тарифа.
// ФТ-7.5: тариф, использованный в начислениях, нельзя удалить или изменить
// ставку — только закрыть датой окончания (и затем создать новый).
import { audit, badRequest, dbError } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { chargeLines, tariffs } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { TARIFF_CONSTRAINTS } from "#lib/server/tariffs.js";
import { id as idSchema, tariffCloseSchema, tariffSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

async function load(id: number): Promise<{ validFrom: string; used: boolean }> {
  const [t] = await db
    .select({ validFrom: tariffs.validFrom })
    .from(tariffs)
    .where(eq(tariffs.id, id));
  if (!t) error(404);
  const used = (await db.$count(chargeLines, eq(chargeLines.tariffId, id))) > 0;
  return { validFrom: t.validFrom, used };
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const current = await load(id);
  const body: unknown = await request.json();

  try {
    if (current.used) {
      const parsed = tariffCloseSchema.safeParse(body);
      if (!parsed.success) {
        badRequest({}, [
          "Тариф уже использован в начислениях: можно только закрыть его датой окончания",
        ]);
      }
      if (parsed.data.validTo < current.validFrom)
        badRequest({ validTo: ["Дата окончания не может быть раньше даты начала"] });
      await db.update(tariffs).set({ validTo: parsed.data.validTo }).where(eq(tariffs.id, id));
      await audit(Number(admin.id), "tariff.close", "tariff", id, parsed.data);
    } else {
      const data = tariffSchema.parse(body);
      await db
        .update(tariffs)
        .set({ ...data, validTo: data.validTo ?? null })
        .where(eq(tariffs.id, id));
      await audit(Number(admin.id), "tariff.update", "tariff", id, data);
    }
  } catch (e) {
    dbError(e, TARIFF_CONSTRAINTS);
  }
  return Response.json({ id });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);
  const id = idSchema.parse(params.id);
  const current = await load(id);
  if (current.used) {
    badRequest({}, [
      "Тариф использован в начислениях — удалить нельзя. Закройте его датой окончания",
    ]);
  }
  await db.delete(tariffs).where(eq(tariffs.id, id));
  await audit(Number(admin.id), "tariff.delete", "tariff", id);
  return new Response(null, { status: 204 });
};
