// =====================================================================
// Схемы проверки данных (zod) — общие для браузера и сервера.
// СТ 5.1: «вводимые значения проверяются при заполнении формы на клиенте
// и повторно на сервере» — поэтому одна и та же схема используется
// в формах (validate из #lib/validation.js) и в +server.ts
// (parseRequestBody(request, schema)).
// Сообщения — на русском; для встроенных проверок zod включена
// русская локаль.
// =====================================================================
import z from "zod";
import { ru } from "zod/locales";

z.config(ru());

// --- Общие кусочки ----------------------------------------------------

export const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
const PASSWORD_RE = /^(?=.*\p{L})(?=.*\d).{8,}$/u;
const NAME_RE = /^[\p{L}][\p{L} -]*$/u;

const required = (msg = "Заполните поле"): z.ZodString => z.string().trim().min(1, msg);

/** Необязательная строка: пустое значение превращается в undefined */
const optionalText = (max: number): z.ZodType<string | undefined, string | undefined> =>
  z
    .string()
    .trim()
    .max(max, `Не более ${max} символов`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const fullName = required("Укажите ФИО")
  .max(150, "Не более 150 символов")
  .regex(NAME_RE, "Только буквы, пробел и дефис");

export const email = z
  .string()
  .trim()
  .min(1, "Укажите email")
  .max(254, "Не более 254 символов")
  .pipe(z.email("Email в формате name@domain.ru"))
  .transform((v) => v.toLowerCase());

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.string().regex(PHONE_RE, "Телефон в формате +7 (XXX) XXX-XX-XX").optional());

export const password = z
  .string()
  .regex(PASSWORD_RE, "Не менее 8 символов, хотя бы одна буква и одна цифра");

/**
 * Десятичное число строкой: «105,000» и «105.000» → "105.000".
 * Возвращаем строку — так numeric в PostgreSQL не теряет точность.
 */
export const decimal = (opts: {
  scale: number;
  positive?: boolean;
  label?: string;
}): z.ZodType<string, string> =>
  z
    .string()
    .trim()
    .min(1, "Заполните поле")
    .transform((v) => v.replace(",", "."))
    .pipe(
      z
        .string()
        .regex(
          new RegExp(`^\\d+(\\.\\d{1,${opts.scale}})?$`),
          `Число, не более ${opts.scale} знаков после запятой`,
        )
        .refine((v) => !opts.positive || Number(v) > 0, "Должно быть больше 0"),
    );

export const isoDate = z.iso.date("Дата в формате ДД.ММ.ГГГГ");
const optionalIsoDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(isoDate.optional());

const intFrom = (min: number, msg: string): z.ZodCoercedNumber =>
  z.coerce.number({ error: msg }).int(msg).min(min, msg);

export const id = z.coerce.number().int().positive();

// --- 3.1 / 3.2 / 3.22 Учётная запись -----------------------------------

export const registrationSchema = z
  .strictObject({
    name: fullName,
    email,
    phone: optionalPhone,
    apartmentNumber: required("Укажите номер квартиры").max(10, "Не более 10 символов"),
    password,
    passwordRepeat: z.string(),
    consent: z.literal(true, "Нужно согласие на обработку персональных данных"),
  })
  .refine((d) => d.password === d.passwordRepeat, {
    path: ["passwordRepeat"],
    message: "Пароли не совпадают",
  });
export type RegistrationInput = z.input<typeof registrationSchema>;

export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1, "Введите пароль"),
});

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: password,
    newPasswordRepeat: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordRepeat, {
    path: ["newPasswordRepeat"],
    message: "Пароли не совпадают",
  });

// --- 3.4 Пользователи ---------------------------------------------------

export const rejectSchema = z.strictObject({
  reason: required("Укажите причину отклонения").max(500, "Не более 500 символов"),
});

export const executorSchema = z.strictObject({
  name: fullName,
  email,
  phone: optionalPhone,
  password,
});

// --- 3.6 Квартиры ---------------------------------------------------------

export const apartmentSchema = z.strictObject({
  number: required("Укажите номер квартиры").max(10, "Не более 10 символов"),
  entrance: intFrom(1, "Целое число от 1"),
  floor: intFrom(1, "Целое число от 1"),
  area: decimal({ scale: 2, positive: true }),
  accountNumber: required("Укажите лицевой счёт").regex(/^\d{1,20}$/, "Только цифры, до 20"),
  initialCold: decimal({ scale: 3 }),
  initialHot: decimal({ scale: 3 }),
});
export type ApartmentInput = z.input<typeof apartmentSchema>;

// --- 3.7 Тарифы -----------------------------------------------------------

export const calcMethodSchema = z.enum(["area", "cold_water", "hot_water", "fixed"]);

export const tariffSchema = z
  .strictObject({
    service: required("Укажите услугу").max(100, "Не более 100 символов"),
    calcMethod: calcMethodSchema,
    rate: decimal({ scale: 2, positive: true }),
    validFrom: isoDate,
    validTo: optionalIsoDate,
  })
  .refine((d) => !d.validTo || d.validTo >= d.validFrom, {
    path: ["validTo"],
    message: "Дата окончания не может быть раньше даты начала",
  });
export type TariffInput = z.input<typeof tariffSchema>;

/** Использованный в начислениях тариф можно только закрыть датой (ФТ-7.5) */
export const tariffCloseSchema = z.strictObject({ validTo: isoDate });

// --- 3.8 Расчётный период -------------------------------------------------

export const periodSchema = z
  .strictObject({
    year: z.coerce.number().int().min(2020).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    readingsStart: isoDate,
    readingsEnd: isoDate,
  })
  .superRefine((d, ctx) => {
    const prefix = `${d.year}-${String(d.month).padStart(2, "0")}-`;
    if (!d.readingsStart.startsWith(prefix))
      ctx.addIssue({
        code: "custom",
        path: ["readingsStart"],
        message: "Дата должна быть внутри расчётного месяца",
      });
    if (!d.readingsEnd.startsWith(prefix))
      ctx.addIssue({
        code: "custom",
        path: ["readingsEnd"],
        message: "Дата должна быть внутри расчётного месяца",
      });
    if (d.readingsEnd < d.readingsStart)
      ctx.addIssue({
        code: "custom",
        path: ["readingsEnd"],
        message: "Окончание не может быть раньше начала",
      });
  });
export type PeriodInput = z.input<typeof periodSchema>;

// --- 3.9 / 3.10 Показания -------------------------------------------------

export const readingSchema = z.strictObject({
  cold: decimal({ scale: 3 }),
  hot: decimal({ scale: 3 }),
});
export type ReadingInput = z.input<typeof readingSchema>;

// --- 3.14 Заявки ----------------------------------------------------------

export const categorySchema = z.enum([
  "plumbing",
  "electrical",
  "heating",
  "elevator",
  "cleaning",
  "territory",
  "intercom_doors",
  "other",
]);

export const requestSchema = z.strictObject({
  category: categorySchema,
  location: z.enum(["apartment", "entrance", "floor", "yard", "basement", "roof", "other"]),
  locationDetail: optionalText(100),
  description: z
    .string()
    .trim()
    .min(10, "Опишите проблему: от 10 символов")
    .max(2000, "Не более 2000 символов"),
  urgent: z
    .union([z.boolean(), z.enum(["true", "false", "on"])])
    .optional()
    .transform((v) => v === true || v === "true" || v === "on"),
});
export type RequestInput = z.input<typeof requestSchema>;

// --- 3.16 Работы ----------------------------------------------------------

const timeOrEmpty = z
  .string()
  .optional()
  .transform((v) => (v ? v.slice(0, 5) : undefined))
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время в формате ЧЧ:ММ")
      .optional(),
  );

export const workSchema = z
  .strictObject({
    title: required("Укажите название").max(150, "Не более 150 символов"),
    type: z.enum(["planned", "unplanned"]),
    category: categorySchema,
    location: z.enum(["whole_house", "entrance", "yard", "basement", "roof", "other"]),
    locationDetail: optionalText(100),
    workDate: isoDate,
    timeStart: timeOrEmpty,
    timeEnd: timeOrEmpty,
    executorId: z
      .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (typeof v === "number" ? v : undefined)),
    contractor: optionalText(100),
    description: optionalText(2000),
    priority: z
      .union([z.enum(["urgent", "normal", "low"]), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v ? v : undefined)),
    requestId: z
      .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (typeof v === "number" ? v : undefined)),
  })
  .superRefine((d, ctx) => {
    if (d.timeStart && d.timeEnd && d.timeEnd <= d.timeStart)
      ctx.addIssue({
        code: "custom",
        path: ["timeEnd"],
        message: "Окончание должно быть позже начала",
      });
    if (d.executorId && d.contractor)
      ctx.addIssue({
        code: "custom",
        path: ["contractor"],
        message: "Укажите либо исполнителя, либо подрядчика",
      });
  })
  .transform((d) => ({ ...d, priority: d.type === "unplanned" ? d.priority : undefined }));
export type WorkInput = z.input<typeof workSchema>;

export const rescheduleSchema = z.strictObject({
  newDate: isoDate,
  reason: required("Укажите причину переноса").max(500, "Не более 500 символов"),
});

export const completeWorkSchema = z.strictObject({
  report: required("Опишите, что сделано").max(2000, "Не более 2000 символов"),
  completedOn: isoDate,
});

export const copyWorkSchema = z.strictObject({ date: isoDate });

// --- Фото (ФТ-14.4, ФТ-16.5) ---------------------------------------------

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

/** Проверка выбранных фото до отправки; возвращает текст ошибки или null */
export function checkPhotos(files: File[], max: number): string | null {
  if (files.length > max) return `Можно приложить не более ${max} фото`;
  for (const f of files) {
    if (!(PHOTO_TYPES as readonly string[]).includes(f.type))
      return `«${f.name}»: только JPG или PNG`;
    if (f.size > PHOTO_MAX_BYTES) return `«${f.name}»: размер больше 5 МБ`;
  }
  return null;
}
