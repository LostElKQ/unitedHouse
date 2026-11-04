// =====================================================================
// «Единый дом» — схема базы данных (Drizzle ORM, PostgreSQL 15+)
// Основа: СТ v1.0, раздел 4 (рисунки 3–4, словарь данных, п. 4.4).
//
// Чего Drizzle не умеет описывать — лежит в ручной миграции
// drizzle/0001_constraints_triggers.sql:
//   • запрет пересечения тарифов (EXCLUDE + расширение btree_gist);
//   • триггеры защиты опубликованного периода;
//   • представление apartment_debts.
// Поэтому базу создаём через `drizzle-kit migrate`, а не `push`.
//
// numeric-поля (деньги, площадь, показания) Drizzle возвращает строкой —
// это нормально и защищает от ошибок округления float.
//
// Авторизация — Better Auth (src/lib/server/auth.ts). Её таблицы:
// users, sessions, accounts (тут хранится хеш пароля), verifications.
// Имена во множественном числе — в auth.ts стоит usePlural: true;
// id числовые — generateId: 'serial'. Поля TS-объектов (name, email,
// emailVerified, image, createdAt…) Better Auth ищет по этим именам,
// переименовывать их нельзя.
// =====================================================================
import { users } from "./auth.schema.ts";
import {
  calcMethod,
  category,
  periodStatus,
  paymentStatus,
  requestLocation,
  requestStatus,
  priority,
  workType,
  workLocation,
  workStatus,
  importance,
} from "./enums.ts";
import { createdAt, tsz, updatedAt } from "./utils.ts";
import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  bigserial,
  integer,
  smallint,
  varchar,
  text,
  boolean,
  numeric,
  date,
  time,
  jsonb,
  check,
  unique,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------
// Настройки ТСЖ (п. 3.5) — всегда одна строка с id = 1
// ---------------------------------------------------------------------
export const hoaSettings = pgTable(
  "hoa_settings",
  {
    id: smallint("id").primaryKey().default(1),
    name: varchar("name", { length: 255 }).notNull().default(""),
    inn: varchar("inn", { length: 10 }),
    kpp: varchar("kpp", { length: 9 }),
    address: varchar("address", { length: 255 }).notNull().default(""),
    chairmanName: varchar("chairman_name", { length: 150 }),
    bankAccount: varchar("bank_account", { length: 20 }),
    bankName: varchar("bank_name", { length: 255 }),
    bik: varchar("bik", { length: 9 }),
    corrAccount: varchar("corr_account", { length: 20 }),
    boardPhone: varchar("board_phone", { length: 18 }),
    emergencyPhone: varchar("emergency_phone", { length: 18 }),
    readingsStartDay: smallint("readings_start_day").notNull().default(20),
    readingsEndDay: smallint("readings_end_day").notNull().default(25),
    reactionHoursUrgent: integer("reaction_hours_urgent").notNull().default(24),
    reactionHoursNormal: integer("reaction_hours_normal").notNull().default(168),
    reactionHoursLow: integer("reaction_hours_low"), // NULL = без срока
    timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Moscow"),
    maintenanceProtocolNo: varchar("maintenance_protocol_no", { length: 50 }), // ФТ-19.3
    maintenanceProtocolDate: date("maintenance_protocol_date"),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("hoa_settings_single_row", sql`${t.id} = 1`),
    check("hoa_settings_inn", sql`${t.inn} ~ '^\\d{10}$'`),
    check("hoa_settings_kpp", sql`${t.kpp} ~ '^\\d{9}$'`),
    check("hoa_settings_bank_account", sql`${t.bankAccount} ~ '^\\d{20}$'`),
    check("hoa_settings_bik", sql`${t.bik} ~ '^\\d{9}$'`),
    check("hoa_settings_corr_account", sql`${t.corrAccount} ~ '^\\d{20}$'`),
    check(
      "hoa_settings_readings_days",
      sql`${t.readingsStartDay} BETWEEN 1 AND 28 AND ${t.readingsEndDay} BETWEEN 1 AND 28 AND ${t.readingsEndDay} >= ${t.readingsStartDay}`,
    ),
    check(
      "hoa_settings_reaction_hours",
      sql`${t.reactionHoursUrgent} > 0 AND ${t.reactionHoursNormal} > 0 AND (${t.reactionHoursLow} IS NULL OR ${t.reactionHoursLow} > 0)`,
    ),
  ],
);

// ---------------------------------------------------------------------
// Квартиры (п. 3.6)
// ---------------------------------------------------------------------
export const apartments = pgTable(
  "apartments",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 10 }).notNull().unique(),
    entrance: smallint("entrance").notNull(),
    floor: smallint("floor").notNull(),
    area: numeric("area", { precision: 8, scale: 2 }).notNull(),
    accountNumber: varchar("account_number", { length: 20 }).notNull().unique(),
    initialCold: numeric("initial_cold", { precision: 12, scale: 3 }).notNull().default("0"), // ФТ-6.2
    initialHot: numeric("initial_hot", { precision: 12, scale: 3 }).notNull().default("0"),
    createdAt: createdAt(),
  },
  (t) => [
    check("apartments_entrance", sql`${t.entrance} >= 1`),
    check("apartments_floor", sql`${t.floor} >= 1`),
    check("apartments_area", sql`${t.area} > 0`),
    check("apartments_account_number", sql`${t.accountNumber} ~ '^\\d{1,20}$'`),
    check("apartments_initial_readings", sql`${t.initialCold} >= 0 AND ${t.initialHot} >= 0`),
  ],
);

// ---------------------------------------------------------------------
// Тарифы (п. 3.7). Запрет пересечения периодов — в ручной миграции.
// ---------------------------------------------------------------------
export const tariffs = pgTable(
  "tariffs",
  {
    id: serial("id").primaryKey(),
    service: varchar("service", { length: 100 }).notNull(),
    calcMethod: calcMethod("calc_method").notNull(),
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"), // NULL = бессрочно
    createdAt: createdAt(),
  },
  (t) => [
    check("tariffs_rate", sql`${t.rate} > 0`),
    check("tariffs_dates", sql`${t.validTo} IS NULL OR ${t.validTo} >= ${t.validFrom}`),
  ],
);

// ---------------------------------------------------------------------
// Расчётные периоды (п. 3.8)
// ---------------------------------------------------------------------
export const billingPeriods = pgTable(
  "billing_periods",
  {
    id: serial("id").primaryKey(),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(),
    readingsStart: date("readings_start").notNull(),
    readingsEnd: date("readings_end").notNull(),
    status: periodStatus("status").notNull().default("readings_open"),
    openedAt: tsz("opened_at").notNull().defaultNow(),
    closedAt: tsz("closed_at"),
    chargesFormedAt: tsz("charges_formed_at"),
    publishedAt: tsz("published_at"),
  },
  (t) => [
    unique("billing_periods_year_month_uq").on(t.year, t.month),
    // ФТ-8.1: одновременно не больше одного неопубликованного периода
    uniqueIndex("billing_periods_one_open_uq")
      .on(sql`(true)`)
      .where(sql`${t.status} <> 'published'`),
    check("billing_periods_year", sql`${t.year} BETWEEN 2020 AND 2100`),
    check("billing_periods_month", sql`${t.month} BETWEEN 1 AND 12`),
    check(
      "billing_periods_readings_dates",
      sql`${t.readingsEnd} >= ${t.readingsStart}
		AND date_trunc('month', ${t.readingsStart}) = make_date(${t.year}, ${t.month}, 1)
		AND date_trunc('month', ${t.readingsEnd}) = make_date(${t.year}, ${t.month}, 1)`,
    ),
  ],
);

// ---------------------------------------------------------------------
// Показания (п. 3.9–3.10). Одна строка = ХВС + ГВС квартиры за период.
// Нет строки за текущий период → квартира «Нет показаний» (ФТ-10.2).
// ---------------------------------------------------------------------
export const meterReadings = pgTable(
  "meter_readings",
  {
    id: serial("id").primaryKey(),
    apartmentId: integer("apartment_id")
      .notNull()
      .references(() => apartments.id, { onDelete: "restrict" }),
    periodId: integer("period_id")
      .notNull()
      .references(() => billingPeriods.id, { onDelete: "restrict" }),
    coldValue: numeric("cold_value", { precision: 12, scale: 3 }).notNull(),
    hotValue: numeric("hot_value", { precision: 12, scale: 3 }).notNull(),
    enteredBy: integer("entered_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    enteredByAdmin: boolean("entered_by_admin").notNull().default(false),
    enteredAt: tsz("entered_at").notNull().defaultNow(),
  },
  (t) => [
    unique("meter_readings_apartment_period_uq").on(t.apartmentId, t.periodId),
    index("meter_readings_period_idx").on(t.periodId),
    check("meter_readings_values", sql`${t.coldValue} >= 0 AND ${t.hotValue} >= 0`),
  ],
);

// ---------------------------------------------------------------------
// Начисления / квитанции (п. 3.11–3.13)
// ---------------------------------------------------------------------
export const charges = pgTable(
  "charges",
  {
    id: serial("id").primaryKey(),
    apartmentId: integer("apartment_id")
      .notNull()
      .references(() => apartments.id, { onDelete: "restrict" }),
    periodId: integer("period_id")
      .notNull()
      .references(() => billingPeriods.id, { onDelete: "restrict" }),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAt: date("paid_at"),
    paymentMarkedBy: integer("payment_marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("charges_apartment_period_uq").on(t.apartmentId, t.periodId),
    index("charges_period_idx").on(t.periodId),
    check("charges_amounts", sql`${t.total} >= 0 AND ${t.paidAmount} >= 0`),
    check(
      "charges_payment_status",
      sql`
		(${t.paymentStatus} = 'unpaid' AND ${t.paidAmount} = 0)
		OR (${t.paymentStatus} = 'partially_paid' AND ${t.paidAmount} > 0 AND ${t.paidAmount} < ${t.total})
		OR (${t.paymentStatus} = 'paid' AND ${t.paidAmount} >= ${t.total})`,
    ),
    check("charges_paid_at", sql`(${t.paidAmount} = 0) = (${t.paidAt} IS NULL)`),
  ],
);

// Строки начисления: «снимок» расчёта (ФТ-11.3)
export const chargeLines = pgTable(
  "charge_lines",
  {
    id: serial("id").primaryKey(),
    chargeId: integer("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    tariffId: integer("tariff_id").references(() => tariffs.id, { onDelete: "restrict" }), // ФТ-7.5
    service: varchar("service", { length: 100 }).notNull(),
    calcMethod: calcMethod("calc_method").notNull(),
    volume: numeric("volume", { precision: 12, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 10 }).notNull(), // 'м²', 'м³', 'шт.'
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [
    index("charge_lines_charge_idx").on(t.chargeId),
    check("charge_lines_values", sql`${t.volume} >= 0 AND ${t.rate} > 0 AND ${t.amount} >= 0`),
  ],
);

// ---------------------------------------------------------------------
// Заявки (п. 3.14–3.15)
// ---------------------------------------------------------------------
export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    number: integer("number").generatedAlwaysAsIdentity().unique(), // «Номер заявки»
    apartmentId: integer("apartment_id")
      .notNull()
      .references(() => apartments.id, { onDelete: "restrict" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    category: category("category").notNull(),
    location: requestLocation("location").notNull(),
    locationDetail: varchar("location_detail", { length: 100 }),
    description: varchar("description", { length: 2000 }).notNull(),
    markedUrgent: boolean("marked_urgent").notNull().default(false), // ФТ-14.5
    priority: priority("priority").notNull().default("normal"),
    status: requestStatus("status").notNull().default("new"),
    createdAt: createdAt(),
    takenAt: tsz("taken_at"), // для расчёта просрочки
    closedAt: tsz("closed_at"),
  },
  (t) => [
    index("requests_apartment_idx").on(t.apartmentId),
    index("requests_status_idx").on(t.status, t.priority, t.createdAt),
    check("requests_description_length", sql`char_length(${t.description}) >= 10`),
  ],
);

// История статусов и приоритетов заявки (ФТ-15.8)
export const requestHistory = pgTable(
  "request_history",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    changedBy: integer("changed_by").references(() => users.id, { onDelete: "set null" }),
    oldStatus: requestStatus("old_status"),
    newStatus: requestStatus("new_status"),
    oldPriority: priority("old_priority"),
    newPriority: priority("new_priority"),
    changedAt: tsz("changed_at").notNull().defaultNow(),
  },
  (t) => [index("request_history_request_idx").on(t.requestId)],
);

// Комментарии к заявке (ФТ-15.5)
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    text: varchar("text", { length: 1000 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("comments_request_idx").on(t.requestId, t.createdAt),
    check("comments_text_not_empty", sql`char_length(${t.text}) > 0`),
  ],
);

// ---------------------------------------------------------------------
// Работы по дому (п. 3.16–3.18)
// ---------------------------------------------------------------------
export const works = pgTable(
  "works",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").references(() => requests.id, { onDelete: "set null" }),
    title: varchar("title", { length: 150 }).notNull(),
    type: workType("type").notNull(),
    category: category("category").notNull(),
    location: workLocation("location").notNull(),
    locationDetail: varchar("location_detail", { length: 100 }),
    workDate: date("work_date").notNull(),
    timeStart: time("time_start"),
    timeEnd: time("time_end"),
    executorId: integer("executor_id").references(() => users.id, { onDelete: "set null" }),
    contractor: varchar("contractor", { length: 100 }), // сторонний подрядчик текстом
    description: text("description"),
    priority: priority("priority"), // только для внеплановых
    status: workStatus("status").notNull().default("planned"),
    report: varchar("report", { length: 2000 }), // отчёт о выполнении
    completedOn: date("completed_on"),
    completedBy: integer("completed_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("works_date_idx").on(t.workDate),
    index("works_executor_idx").on(t.executorId, t.workDate),
    index("works_request_idx").on(t.requestId),
    check(
      "works_time_range",
      sql`${t.timeEnd} IS NULL OR ${t.timeStart} IS NULL OR ${t.timeEnd} > ${t.timeStart}`,
    ),
    check("works_executor_or_contractor", sql`${t.executorId} IS NULL OR ${t.contractor} IS NULL`),
    check("works_priority_only_unplanned", sql`${t.type} = 'unplanned' OR ${t.priority} IS NULL`),
    // ФТ-16.5: «Выполнена» только с отчётом и датой
    check(
      "works_done_has_report",
      sql`${t.status} <> 'done' OR (${t.report} IS NOT NULL AND ${t.completedOn} IS NOT NULL)`,
    ),
  ],
);

// История переносов (ФТ-16.3)
export const workReschedules = pgTable(
  "work_reschedules",
  {
    id: serial("id").primaryKey(),
    workId: integer("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    oldDate: date("old_date").notNull(),
    newDate: date("new_date").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("work_reschedules_work_idx").on(t.workId),
    check("work_reschedules_dates", sql`${t.newDate} <> ${t.oldDate}`),
    check("work_reschedules_reason", sql`char_length(${t.reason}) > 0`),
  ],
);

// ---------------------------------------------------------------------
// Вложения (фото): ровно один владелец — заявка или работа
// ---------------------------------------------------------------------
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").references(() => requests.id, { onDelete: "cascade" }),
    workId: integer("work_id").references(() => works.id, { onDelete: "cascade" }),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 20 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("attachments_request_idx").on(t.requestId),
    index("attachments_work_idx").on(t.workId),
    check("attachments_mime_type", sql`${t.mimeType} IN ('image/jpeg', 'image/png')`),
    check("attachments_size", sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= 5242880`),
    check("attachments_one_owner", sql`(${t.requestId} IS NULL) <> (${t.workId} IS NULL)`),
  ],
);

// ---------------------------------------------------------------------
// Перечень работ по содержанию (п. 3.19)
// ---------------------------------------------------------------------
export const maintenanceItems = pgTable(
  "maintenance_items",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    periodicity: varchar("periodicity", { length: 100 }).notNull(),
    annualCost: numeric("annual_cost", { precision: 12, scale: 2 }),
    note: varchar("note", { length: 500 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [check("maintenance_items_cost", sql`${t.annualCost} >= 0`)],
);

// ---------------------------------------------------------------------
// Объявления (п. 3.20); удалённые хранятся 30 дней (п. 6.4)
// ---------------------------------------------------------------------
export const announcements = pgTable(
  "announcements",
  {
    id: serial("id").primaryKey(),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 150 }).notNull(),
    body: varchar("body", { length: 5000 }).notNull(),
    importance: importance("importance").notNull().default("normal"),
    pinned: boolean("pinned").notNull().default(false),
    actualUntil: date("actual_until"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: tsz("deleted_at"),
  },
  (t) => [
    index("announcements_feed_idx")
      .on(t.pinned.desc(), t.createdAt.desc())
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

// ---------------------------------------------------------------------
// Журнал действий (п. 6.3, требование 6); хранится не менее 1 года
// ---------------------------------------------------------------------
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // 'tariff.update', 'charges.publish' и т. п.
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id"),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_created_idx").on(t.createdAt.desc()),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
  ],
);

// Типы строк для использования в коде: User, NewUser и т. д.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Apartment = typeof apartments.$inferSelect;
export type Tariff = typeof tariffs.$inferSelect;
export type BillingPeriod = typeof billingPeriods.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type ChargeLine = typeof chargeLines.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type Work = typeof works.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
