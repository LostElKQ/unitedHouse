import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { users } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { rejectSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();

// ФТ-4.3: отклонение регистрации с обязательной причиной
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);

  const id = idSchema.parse(params.id);
  const { reason } = await parseRequestBody(request, rejectSchema);

  const [target] = await db.select({ status: users.status }).from(users).where(eq(users.id, id));
  if (!target) error(404);
  if (target.status !== "pending")
    badRequest({}, ["Отклонить можно только заявку в статусе «Ожидает подтверждения»"]);

  const [updated] = await db
    .update(users)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(users.id, id))
    .returning({ id: users.id, status: users.status, rejectionReason: users.rejectionReason });

  await audit(Number(admin.id), "user.reject", "user", id, { reason });

  return Response.json(updated);
};
