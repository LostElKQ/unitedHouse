// ---------------------------------------------------------------------
// Better Auth: пользователи (п. 3.1–3.4, 3.22)
// Стандартные поля Better Auth: id, name, email, emailVerified, image,
// createdAt, updatedAt. Остальное — наши дополнительные поля
// (объявлены в auth.ts → user.additionalFields).
// Пароля здесь нет: Better Auth хранит его хеш в accounts.password.

import { userRole, userStatus } from "./enums.ts";
import { apartments } from "./main.schema.ts";
import { createdAt, tsz, updatedAt } from "./utils";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("full_name", { length: 150 }).notNull(), // «ФИО»
    email: varchar("email", { length: 254 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    apartmentId: integer("apartment_id").references(() => apartments.id, { onDelete: "restrict" }),
    phone: varchar("phone", { length: 18 }),
    role: userRole("role").notNull().default("resident"),
    status: userStatus("status").notNull().default("pending"),
    rejectionReason: varchar("rejection_reason", { length: 500 }), // ФТ-4.3
    mustChangePassword: boolean("must_change_password").notNull().default(false), // ФТ-4.7
    pdConsentAt: tsz("pd_consent_at"), // ФТ-1.6
    failedLoginAttempts: smallint("failed_login_attempts").notNull().default(0), // ФТ-2.3
    lockedUntil: tsz("locked_until"),
    deletionRequestedAt: tsz("deletion_requested_at"), // ФТ-22.4
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(sql`lower(${t.email})`),
    index("users_apartment_idx").on(t.apartmentId),
    index("users_status_idx").on(t.status),
    check("users_phone_format", sql`${t.phone} ~ '^\\+7 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}$'`),
    // у жителя обязательно есть квартира, у админа и исполнителя — нет
    check(
      "users_resident_has_apartment",
      sql`(${t.role} = 'resident') = (${t.apartmentId} IS NOT NULL)`,
    ),
    check(
      "users_rejection_reason",
      sql`${t.status} <> 'rejected' OR ${t.rejectionReason} IS NOT NULL`,
    ),
  ],
);

// Better Auth: сессии (ФТ-2.6; срок и продление — в auth.ts)
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: tsz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// Better Auth: способы входа. Для входа по email и паролю —
// строка с provider_id = 'credential', account_id = id пользователя,
// password = хеш пароля (scrypt).
export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tsz("access_token_expires_at"),
    refreshTokenExpiresAt: tsz("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    unique("accounts_provider_account_uq").on(t.providerId, t.accountId),
  ],
);

// Better Auth: одноразовые токены — в т. ч. ссылка восстановления пароля (п. 3.3)
export const verifications = pgTable(
  "verifications",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tsz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);
