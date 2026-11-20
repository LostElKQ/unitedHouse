// ФТ-12.2: квитанция (житель — только своя и опубликованная, ФТ-12.4)
import { checkAuthAccess } from "#lib/server/helpers.js";
import { getReceipt } from "#lib/server/receipts.js";
import { id as idSchema } from "#lib/schemas.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  const user = checkAuthAccess(locals, ["resident", "admin"]);
  return Response.json(await getReceipt(idSchema.parse(params.id), user));
};
