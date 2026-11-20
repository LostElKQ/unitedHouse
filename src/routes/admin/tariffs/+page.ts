import { api } from "#lib/api/client.js";
import type { TariffRow } from "#lib/api/types.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, depends }) => {
  depends("app:tariffs");
  return { tariffs: await api.get<TariffRow[]>("/api/tariffs", { fetch }) };
};
