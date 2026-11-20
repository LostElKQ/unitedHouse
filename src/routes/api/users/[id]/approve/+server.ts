import { users } from "#lib/server/db/auth.schema.js";
import { db } from "#lib/server/db/index.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { and, eq, ne } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();

export const POST: RequestHandler = async ({ locals, params }) => {
  checkAuthAccess(locals, ["admin"]);

  const id = idSchema.parse(params.id);

  const [forUpdate] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, id));

  if (!forUpdate) error(404);
  if (forUpdate.status === "active")
    return error(400, "Bad request", { formErrors: ["Пользователь уже активен"] });

  const [updated] = await db
    .update(users)
    .set({ status: "active", rejectionReason: null })
    .where(and(eq(users.id, id), ne(users.status, "active")))
    .returning({ id: users.id, status: users.status });

  return Response.json(updated);
};
