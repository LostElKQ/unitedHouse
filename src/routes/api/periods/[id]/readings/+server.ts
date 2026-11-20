// 3.10 Таблица показаний периода (ФТ-10.1, 10.2; раздел 4.3)
import type { PeriodReadings } from "#lib/api/types.js";
import { getPeriod, readingsForPeriod } from "#lib/server/billing.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { id as idSchema } from "#lib/schemas.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  checkAuthAccess(locals, ["admin"]);
  const period = await getPeriod(idSchema.parse(params.id));
  const rows = await readingsForPeriod(period.id);

  const sum = (key: "coldUsage" | "hotUsage"): string =>
    (rows.reduce((acc, r) => acc + Math.round(Number(r[key] ?? 0) * 1000), 0) / 1000).toFixed(3);

  const body: PeriodReadings = {
    period,
    rows,
    totals: { cold: sum("coldUsage"), hot: sum("hotUsage") },
  };
  return Response.json(body);
};
