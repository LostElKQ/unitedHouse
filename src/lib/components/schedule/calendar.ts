// =====================================================================
// Календарь графика работ (ФТ-17.1): режимы, диапазоны дат, подписи.
// Неделя начинается с понедельника. Даты — строки «ГГГГ-ММ-ДД» без
// часовых поясов, чтобы день не «съезжал».
// =====================================================================
import { addDays } from "#lib/format.js";

export type View = "day" | "week" | "month" | "list";
export const VIEWS: Array<{ id: View; label: string }> = [
  { id: "day", label: "День" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "list", label: "Список" },
];

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];
const MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return [y, m, d];
}

/** 0 = понедельник … 6 = воскресенье */
export function weekday(iso: string): number {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function weekStart(iso: string): string {
  return addDays(iso, -weekday(iso));
}

export function monthStart(iso: string): string {
  const [y, m] = parts(iso);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function monthEnd(iso: string): string {
  const [y, m] = parts(iso);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function addMonths(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

/** Диапазон дат, который нужно загрузить для режима */
export function rangeFor(view: View, date: string): { from: string; to: string } {
  switch (view) {
    case "day":
      return { from: date, to: date };
    case "week": {
      const s = weekStart(date);
      return { from: s, to: addDays(s, 6) };
    }
    case "month":
      return { from: weekStart(monthStart(date)), to: addDays(weekStart(monthEnd(date)), 6) };
    case "list":
      return { from: monthStart(date), to: monthEnd(date) };
  }
}

/** Соседний период для кнопок «назад» и «вперёд» */
export function shift(view: View, date: string, dir: -1 | 1): string {
  if (view === "day") return addDays(date, dir);
  if (view === "week") return addDays(date, 7 * dir);
  return addMonths(date, dir);
}

export function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[weekday(iso)] ?? "";
}

export const WEEKDAY_HEADERS = WEEKDAYS_SHORT;

/** «20 ноября» */
export function dayMonth(iso: string): string {
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}

/** Заголовок периода: «Пт, 20 ноября 2026», «16–22 ноября 2026», «Ноябрь 2026» */
export function titleFor(view: View, date: string): string {
  const [y, m] = parts(date);
  if (view === "day") return `${weekdayShort(date)}, ${dayMonth(date)} ${y}`;
  if (view === "week") {
    const { from, to } = rangeFor("week", date);
    const [fy, fm, fd] = parts(from);
    const [ty, tm, td] = parts(to);
    if (fm === tm) return `${fd}–${td} ${MONTHS_GEN[tm - 1]} ${ty}`;
    return `${fd} ${MONTHS_GEN[fm - 1]}${fy !== ty ? ` ${fy}` : ""} – ${td} ${MONTHS_GEN[tm - 1]} ${ty}`;
  }
  const name = MONTHS[m - 1] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export function isView(v: string | null): v is View {
  return v === "day" || v === "week" || v === "month" || v === "list";
}
