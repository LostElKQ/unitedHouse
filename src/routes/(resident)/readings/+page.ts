import { api } from "#lib/api/client.js";
import type { MyReadings } from "#lib/api/types.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, depends }) => {
  depends("app:my-readings");
  return { readings: await api.get<MyReadings>("/api/my/readings", { fetch }) };
};
