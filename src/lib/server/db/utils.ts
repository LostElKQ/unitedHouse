import type { HasDefault, NotNull } from "drizzle-orm";
import { timestamp, type PgTimestampBuilderInitial } from "drizzle-orm/pg-core";

export const createdAt = (): HasDefault<NotNull<PgTimestampBuilderInitial<"created_at">>> =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = (): HasDefault<NotNull<PgTimestampBuilderInitial<"updated_at">>> =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
export const tsz = (name: string): PgTimestampBuilderInitial<string> =>
  timestamp(name, { withTimezone: true });
