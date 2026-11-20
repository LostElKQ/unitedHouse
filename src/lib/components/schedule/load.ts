// Общая загрузка графика для +page.ts администратора, жителя и исполнителя.
// Состояние (режим, дата, фильтры) хранится в адресе страницы.
import { api } from "#lib/api/client.js";
import type { PublicSettings, WorkItem } from "#lib/api/types.js";
import { todayIso } from "#lib/format.js";
import { categoryLabels, type Category, type WorkType } from "#lib/labels.js";
import { isView, rangeFor, type View } from "./calendar.ts";

export type ScheduleFilters = { entrance: string; type: "" | WorkType; category: "" | Category };

export type ScheduleData = {
  view: View;
  date: string;
  today: string;
  filters: ScheduleFilters;
  works: WorkItem[];
  settings: PublicSettings;
};

export async function loadSchedule(
  fetch: typeof globalThis.fetch,
  url: URL,
  opts: { defaultView: View } = { defaultView: "week" },
): Promise<ScheduleData> {
  const settings = await api.get<PublicSettings>("/api/settings/public", { fetch });
  const today = todayIso(settings.timezone);

  const v = url.searchParams.get("view");
  const view: View = isView(v) ? v : opts.defaultView;
  const d = url.searchParams.get("date");
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;

  const entrance = url.searchParams.get("entrance") ?? "";
  const typeParam = url.searchParams.get("type");
  const type: ScheduleFilters["type"] =
    typeParam === "planned" || typeParam === "unplanned" ? typeParam : "";
  const categoryParam = url.searchParams.get("category") ?? "";
  const category = (
    categoryParam in categoryLabels ? categoryParam : ""
  ) as ScheduleFilters["category"];

  const { from, to } = rangeFor(view, date);
  const works = await api.get<WorkItem[]>("/api/works", {
    fetch,
    query: {
      from,
      to,
      entrance: entrance || undefined,
      type: type || undefined,
      category: category || undefined,
    },
  });

  return { view, date, today, filters: { entrance, type, category }, works, settings };
}
