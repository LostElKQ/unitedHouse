import { api } from "#lib/api/client.js";
import type { Period, PeriodCharges, PeriodReadings, PublicSettings } from "#lib/api/types.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url, depends }) => {
  depends("app:billing");

  const [periods, settings] = await Promise.all([
    api.get<Period[]>("/api/periods", { fetch }),
    api.get<PublicSettings>("/api/settings/public", { fetch }),
  ]);

  const wanted = Number(url.searchParams.get("period"));
  const period = periods.find((p) => p.id === wanted) ?? periods[0] ?? null;
  const current = periods.find((p) => p.status !== "published") ?? null;

  const formed = period && (period.status === "charges_formed" || period.status === "published");
  const tabParam = url.searchParams.get("tab");
  const tab: "readings" | "charges" =
    tabParam === "charges" || tabParam === "readings"
      ? tabParam
      : period?.status === "published"
        ? "charges"
        : "readings";

  const [readings, charges] = period
    ? await Promise.all([
        api.get<PeriodReadings>(`/api/periods/${period.id}/readings`, { fetch }),
        formed ? api.get<PeriodCharges>(`/api/periods/${period.id}/charges`, { fetch }) : null,
      ])
    : [null, null];

  return { periods, period, current, readings, charges, tab, settings };
};
