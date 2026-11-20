// Общие запросы по квартирам для эндпоинтов
import { sql, type SQL } from "drizzle-orm";
import { apartments } from "./db/schema.ts";

/** Естественный порядок номеров: 1, 2, 10, 12а (а не 1, 10, 12а, 2) */
export const apartmentOrder: SQL[] = [
  sql`coalesce(substring(${apartments.number} from '^\\d+')::int, 0)`,
  sql`${apartments.number}`,
];

/** Нарушения уникальности → понятные ошибки у полей формы */
export const APARTMENT_CONSTRAINTS: Record<string, [string, string]> = {
  apartments_number_unique: ["number", "Квартира с таким номером уже есть"],
  apartments_account_number_unique: ["accountNumber", "Такой лицевой счёт уже есть"],
};
