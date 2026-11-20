import { createStaffUser, createStaffUserSchema } from "#lib/server/auth.js";
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { users } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { eq, sql } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const { role: _, ...schemaShape } = createStaffUserSchema.shape;

const requestSchema = z.strictObject(schemaShape);

export const POST: RequestHandler = async ({ locals, request }) => {
  const admin = checkAuthAccess(locals, ["admin"]);

  const requestData = await parseRequestBody(request, requestSchema);

  if ((await db.$count(users, eq(sql`lower(${users.email})`, requestData.email))) >= 1)
    badRequest({ email: ["Пользователь с таким email уже существует"] }, [], 409);

  const executor = await createStaffUser({ ...requestData, role: "executor" });
  await audit(Number(admin.id), "user.create_executor", "user", Number(executor.id));

  return Response.json({
    id: executor.id,
    name: executor.name,
    email: executor.email,
    role: executor.role,
    status: executor.status,
    mustChangePassword: executor.mustChangePassword,
  });
};
