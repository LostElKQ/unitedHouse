import { getPeriod } from "#lib/server/billing.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { id as idSchema } from "#lib/schemas.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  checkAuthAccess(locals, ["admin"]);
  return Response.json(await getPeriod(idSchema.parse(params.id)));
};
