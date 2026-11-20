import { users } from "#lib/server/db/auth.schema.js";
import { db } from "#lib/server/db/index.js";
import { parseRequestBody } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();
const requestSchema = z.strictObject({ role: z.enum(["admin", "resident"]) });

export const PATCH: RequestHandler = async ({ locals: { user }, request, params }) => {
  if (!user || user.role !== "admin") return error(403);

  const id = idSchema.parse(params.id);
  const { role } = await parseRequestBody(request, requestSchema);

  if (role === "resident") {
    const activeAdmins = await db.$count(users, eq(users.role, "admin"));
    if (activeAdmins <= 1) {
      return error(400, "Bad request", {
        formErrors: ["В системе должно остаться больше одного администратора"],
      });
    }
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning({ id: users.id, status: users.role });

  if (!updated) error(404);

  return Response.json(updated);
};
