import { db } from "#lib/server/db/index.js";
import { users } from "#lib/server/db/schema.js";
import { parseRequestBody } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const idSchema = z.coerce.number().positive();
const requestSchema = z.strictObject({ reason: z.string().nonempty() });

export const POST: RequestHandler = async ({ locals: { user }, params, request }) => {
  if (!user || user.role !== "admin") return error(403);

  const id = idSchema.parse(params.id);
  const { reason } = await parseRequestBody(request, requestSchema);

  const [updated] = await db
    .update(users)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(users.id, id))
    .returning({ id: users.id, status: users.status, rejectionReason: users.rejectionReason });

  if (!updated) error(404);

  return Response.json(updated);
};
