import { api } from "#lib/api/client.js";
import type { RequestItem } from "#lib/api/types.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, depends }) => {
  depends("app:my-requests");
  return { requests: await api.get<RequestItem[]>("/api/my/requests", { fetch }) };
};
