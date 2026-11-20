// ФТ-12.1, ФТ-13.5: квитанции своей квартиры по месяцам
import { checkAuthAccess } from "#lib/server/helpers.js";
import { listMyReceipts } from "#lib/server/receipts.js";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  const user = checkAuthAccess(locals, ["resident"]);
  if (!user.apartmentId) error(403);
  return Response.json(await listMyReceipts(user.apartmentId));
};
