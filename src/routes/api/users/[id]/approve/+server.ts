import { users } from "#lib/server/db/auth.schema.js";
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { and, eq, ne } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();

// ФТ-4.2: «Подтвердить» — статус «Активен», житель привязан к квартире
export const POST: RequestHandler = async ({ locals, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);

  const id = idSchema.parse(params.id);

  const [forUpdate] = await db
    .select({ id: users.id, status: users.status, apartmentId: users.apartmentId })
    .from(users)
    .where(eq(users.id, id));

  if (!forUpdate) error(404);
  if (forUpdate.status === "active") badRequest({}, ["Пользователь уже активен"]);
  if (forUpdate.status === "blocked")
    badRequest({}, ["Пользователь заблокирован — используйте разблокировку"]);

  const [updated] = await db
    .update(users)
    .set({ status: "active", rejectionReason: null })
    .where(and(eq(users.id, id), ne(users.status, "active")))
    .returning({ id: users.id, status: users.status });

  await audit(Number(admin.id), "user.approve", "user", id, {
    apartmentId: forUpdate.apartmentId,
  });

  return Response.json(updated);
};
