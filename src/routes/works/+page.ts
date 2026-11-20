import { loadSchedule } from "#lib/components/schedule/load.js";
import type { PageLoad } from "./$types";

// ФТ-18.1: по умолчанию — работы на сегодня
export const load: PageLoad = async ({ fetch, url, depends }) => {
  depends("app:works");
  return { schedule: await loadSchedule(fetch, url, { defaultView: "day" }) };
};
