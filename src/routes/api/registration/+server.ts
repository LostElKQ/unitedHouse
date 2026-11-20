// ФТ-1.1–1.7: регистрация жителя.
// Отдельный эндпоинт нужен, потому что житель вводит НОМЕР квартиры,
// а Better Auth ждёт apartmentId. Здесь же — понятные русские ошибки
// в формате { fieldErrors }.
import { auth } from "#lib/server/auth.js";
import { badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { apartments, users } from "#lib/server/db/schema.js";
import { parseRequestBody } from "#lib/server/helpers.js";
import { registrationSchema } from "#lib/schemas.js";
import { isAPIError } from "better-auth/api";
import { eq, sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const EMAIL_TAKEN = "Пользователь с таким email уже существует";

export const POST: RequestHandler = async ({ request }) => {
  const data = await parseRequestBody(request, registrationSchema);

  const [apartment] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(sql`lower(${apartments.number}) = lower(${data.apartmentNumber})`);
  if (!apartment) {
    badRequest({
      apartmentNumber: ["Квартира с таким номером не найдена. Обратитесь в правление ТСЖ"],
    });
  }

  const taken = await db.$count(users, eq(sql`lower(${users.email})`, data.email));
  if (taken > 0) badRequest({ email: [EMAIL_TAKEN] }, [], 409);

  try {
    await auth.api.signUpEmail({
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        apartmentId: apartment.id,
        phone: data.phone,
        pdConsentAt: new Date(), // ФТ-1.6: дата и время согласия
      },
    });
  } catch (e) {
    if (isAPIError(e) && e.status === "UNPROCESSABLE_ENTITY") {
      badRequest({ email: [EMAIL_TAKEN] }, [], 409);
    }
    if (isAPIError(e)) badRequest({}, [e.message]);
    throw e;
  }

  return Response.json({ status: "pending" }, { status: 201 });
};
