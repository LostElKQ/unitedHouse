import { users } from "#lib/server/db/auth.schema.js";
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();
const requestSchema = z.strictObject({ status: z.enum(["blocked", "active"]) });

// ФТ-4.5: блокировка и разблокировка (в том числе исполнителей, ФТ-4.7)
export const PATCH: RequestHandler = async ({ locals, request, params }) => {
  const admin = checkAuthAccess(locals, ["admin"]);

  const id = idSchema.parse(params.id);
  const { status } = await parseRequestBody(request, requestSchema);

  const [target] = await db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, id));
  if (!target) error(404);
  if (target.role === "admin")
    badRequest({}, ["Администратора нельзя заблокировать: сначала снимите с него роль"]);
  if (status === "active" && target.status !== "blocked")
    badRequest({}, ["Разблокировать можно только заблокированного пользователя"]);
  if (status === "blocked" && target.status !== "active")
    badRequest({}, ["Заблокировать можно только активного пользователя"]);

  const [updated] = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, id))
    .returning({ id: users.id, status: users.status });

  await audit(Number(admin.id), status === "blocked" ? "user.block" : "user.unblock", "user", id);

  return Response.json(updated);
};
