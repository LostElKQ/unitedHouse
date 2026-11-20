import { users } from "#lib/server/db/auth.schema.js";
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();
const requestSchema = z.strictObject({ role: z.enum(["admin", "resident"]) });

// ФТ-4.6: назначить или снять роль «Администратор»
export const PATCH: RequestHandler = async ({ locals, request, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);

  const id = idSchema.parse(params.id);
  const { role } = await parseRequestBody(request, requestSchema);

  const [target] = await db
    .select({ role: users.role, status: users.status, apartmentId: users.apartmentId })
    .from(users)
    .where(eq(users.id, id));
  if (!target) error(404);
  if (target.role === "executor") badRequest({}, ["Роль исполнителя изменить нельзя"]);
  if (target.status !== "active")
    badRequest({}, ["Роль можно изменить только у активного пользователя"]);

  if (role === "resident") {
    const activeAdmins = await db.$count(
      users,
      and(eq(users.role, "admin"), eq(users.status, "active")),
    );
    if (activeAdmins <= 1) {
      badRequest({}, ["Нельзя снять роль с последнего администратора"]);
    }
    if (!target.apartmentId)
      badRequest({}, ["У пользователя нет квартиры: житель должен быть привязан к квартире"]);
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning({ id: users.id, role: users.role });

  await audit(Number(admin.id), "user.role", "user", id, { from: target.role, to: role });

  return Response.json(updated);
};
