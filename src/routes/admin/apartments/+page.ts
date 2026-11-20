import { api } from "#lib/api/client.js";
import type { ApartmentRow } from "#lib/api/types.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url, depends }) => {
  depends("app:apartments");
  const q = url.searchParams.get("q") ?? "";
  const apartments = await api.get<ApartmentRow[]>("/api/apartments", { fetch, query: { q } });
  return { q, apartments };
};
