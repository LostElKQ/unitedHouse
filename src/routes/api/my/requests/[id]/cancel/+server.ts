// ФТ-14.8: житель может отменить заявку, пока она «Новая»
import { badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { requestHistory, requests } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { id as idSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
  const user = checkAuthAccess(locals, ["resident"]);
  const id = idSchema.parse(params.id);

  const [r] = await db
    .select({ apartmentId: requests.apartmentId, status: requests.status })
    .from(requests)
    .where(eq(requests.id, id));
  if (!r || r.apartmentId !== user.apartmentId) error(404);
  if (r.status !== "new") badRequest({}, ["Отменить можно только новую заявку"]);

  await db.transaction(async (tx) => {
    await tx
      .update(requests)
      .set({ status: "cancelled", closedAt: new Date() })
      .where(and(eq(requests.id, id), eq(requests.status, "new")));
    await tx.insert(requestHistory).values({
      requestId: id,
      changedBy: Number(user.id),
      oldStatus: "new",
      newStatus: "cancelled",
    });
  });
  return Response.json({ id, status: "cancelled" });
};
