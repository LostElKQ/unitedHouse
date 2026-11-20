import { users } from "#lib/server/db/auth.schema.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess, parseRequestBody } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { and, eq, ne } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();
const requestSchema = z.strictObject({ status: z.enum(["blocked", "active"]) });

export const PATCH: RequestHandler = async ({ locals, request, params }) => {
  checkAuthAccess(locals, ["admin"]);

  const id = idSchema.parse(params.id);
  const { status } = await parseRequestBody(request, requestSchema);

  const [updated] = await db
    .update(users)
    .set({ status })
    .where(and(ne(users.role, "admin"), eq(users.id, id)))
    .returning({ id: users.id, status: users.status });

  if (!updated) error(404);

  return Response.json(updated);
};
