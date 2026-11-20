import { api } from "#lib/api/client.js";
import type { Receipt } from "#lib/api/types.js";
import { id } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params }) => {
  const parsed = id.safeParse(params.id);
  if (!parsed.success) error(404);
  return { receipt: await api.get<Receipt>(`/api/receipts/${parsed.data}`, { fetch }) };
};
