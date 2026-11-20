// =====================================================================
// Форматирование для интерфейса и проверки НП-8 (СТ v1.0, раздел 7):
//   деньги  – «1 234,56 ₽»
//   дата    – ДД.ММ.ГГГГ, время – ЧЧ:ММ (24 ч) в часовом поясе ТСЖ
//   вода    – м³, 3 знака; площадь – м², 2 знака
// numeric-поля приходят из API строками ("1500.00") — принимаем и строки.
// =====================================================================

export const DEFAULT_TIMEZONE = "Europe/Moscow";

type Numeric = number | string;

function toNumber(value: Numeric): number {
  return typeof value === "number" ? value : Number(value);
}

function fixed(value: Numeric, digits: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(toNumber(value))
    .replace(/\s/g, " "); // неразрывные пробелы из Intl → обычные
}

/** 1234.56 → «1 234,56 ₽» */
export function formatMoney(value: Numeric): string {
  return `${fixed(value, 2)} ₽`;
}

/** 5 → «5,000 м³» */
export function formatVolume(value: Numeric): string {
  return `${fixed(value, 3)} м³`;
}

/** 50 → «50,00 м²» */
export function formatArea(value: Numeric): string {
  return `${fixed(value, 2)} м²`;
}

/** Число без единиц с заданным числом знаков: 47.13 → «47,13» */
export function formatNumber(value: Numeric, digits = 2): string {
  return fixed(value, digits);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Дата → «ДД.ММ.ГГГГ».
 * Строка вида «2026-11-15» (поле date в БД) выводится как есть, без
 * сдвига по часовому поясу; Date и ISO-время переводятся в пояс ТСЖ.
 */
export function formatDate(value: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  if (typeof value === "string") {
    const m = DATE_ONLY.exec(value);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

/** Момент времени → «ДД.ММ.ГГГГ ЧЧ:ММ» в поясе ТСЖ */
export function formatDateTime(value: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return `${formatDate(new Date(value), timeZone)} ${time}`;
}

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

/** Расчётный период: (2026, 10) → «Октябрь 2026» */
export function formatPeriod(year: number, month: number): string {
  return `${MONTHS[month - 1] ?? "?"} ${year}`;
}

/**
 * Маска телефона при вводе: любые цифры → «+7 (XXX) XXX-XX-XX».
 * Первая 7 или 8 считается кодом страны.
 */
export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("7") || digits.startsWith("8")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];
  let out = `+7 (${parts[0]}`;
  if (digits.length >= 3) out += ")";
  if (parts[1]) out += ` ${parts[1]}`;
  if (parts[2]) out += `-${parts[2]}`;
  if (parts[3]) out += `-${parts[3]}`;
  return out;
}

export const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

/** Сегодняшняя дата «ГГГГ-ММ-ДД» в часовом поясе ТСЖ */
export function todayIso(timeZone = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** «ГГГГ-ММ-ДД» ± n дней (без часовых поясов) */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
