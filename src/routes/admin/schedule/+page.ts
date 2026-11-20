import { loadSchedule } from "#lib/components/schedule/load.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url, depends }) => {
  depends("app:works");
  return { schedule: await loadSchedule(fetch, url) };
};
