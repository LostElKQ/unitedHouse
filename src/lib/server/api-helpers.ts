// =====================================================================
// Помощники для эндпоинтов, в дополнение к helpers.ts:
//   • audit()        — запись в журнал действий (СТ 6.3, Тр. 6);
//   • badRequest()   — 400 в формате handleError: { formErrors, fieldErrors };
//   • dbError()      — понятные ошибки вместо 500 для нарушений ограничений БД.
// =====================================================================
import { error } from "@sveltejs/kit";
import { db } from "./db/index.ts";
import { auditLog } from "./db/schema.ts";

type Executor = Pick<typeof db, "insert">;

export async function audit(
  userId: number,
  action: string,
  entityType: string,
  entityId: number | null,
  details?: Record<string, unknown>,
  tx: Executor = db,
): Promise<void> {
  await tx.insert(auditLog).values({ userId, action, entityType, entityId, details });
}

export function badRequest(
  fieldErrors: Partial<Record<string, string[]>> = {},
  formErrors: string[] = [],
  status = 400,
): never {
  error(status, { message: "Bad request", formErrors, fieldErrors });
}

type PgError = { code?: string; constraint_name?: string; constraint?: string; message?: string };

function pgErrorOf(e: unknown): PgError | null {
  let cur: unknown = e;
  for (let i = 0; i < 3 && cur; i++) {
    const c = cur as PgError & { cause?: unknown };
    if (typeof c.code === "string" && /^[0-9A-Z]{5}$/.test(c.code)) return c;
    cur = c.cause;
  }
  return null;
}

/**
 * Превращает ошибку PostgreSQL в ответ 400/409 с понятным текстом.
 * constraints: имя ограничения → [поле, сообщение].
 * Неизвестные ошибки пробрасываются дальше (→ 500).
 */
export function dbError(e: unknown, constraints: Record<string, [string, string]> = {}): never {
  const pg = pgErrorOf(e);
  if (pg) {
    const name = pg.constraint_name ?? pg.constraint ?? "";
    const known = constraints[name];
    if (known) {
      const status = pg.code === "23505" || pg.code === "23P01" ? 409 : 400;
      badRequest({ [known[0]]: [known[1]] }, [], status);
    }
    // RAISE EXCEPTION из триггеров (защита опубликованного периода)
    if (pg.code === "P0001" && pg.message) badRequest({}, [pg.message]);
    if (pg.code === "23503") badRequest({}, ["Запись связана с другими данными"], 409);
  }
  throw e;
}
