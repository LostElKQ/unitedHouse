import { loadSchedule } from "#lib/components/schedule/load.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => ({
  schedule: await loadSchedule(fetch, url),
});
