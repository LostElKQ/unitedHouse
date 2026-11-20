import { createStaffUser, createStaffUserSchema } from "#lib/server/auth.js";
import { db } from "#lib/server/db/index.js";
import { users } from "#lib/server/db/schema.js";
import { parseRequestBody } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const { role: _, ...schemaShape } = createStaffUserSchema.shape;

const requestSchema = z.strictObject(schemaShape);

export const POST: RequestHandler = async ({ locals: { user }, request }) => {
  if (!user || user.role !== "admin") return error(403);

  const requestData = await parseRequestBody(request, requestSchema);

  if ((await db.$count(users, eq(users.email, requestData.email))) >= 1)
    return error(409, "Conflict");

  const executor = await createStaffUser({ ...requestData, role: "executor" });

  return Response.json({
    id: executor.id,
    name: executor.name,
    email: executor.email,
    role: executor.role,
    status: executor.status,
    mustChangePassword: executor.mustChangePassword,
  });
};
