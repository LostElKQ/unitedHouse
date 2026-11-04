// ---------------------------------------------------------------------
// Перечисления (в БД — английские значения, в интерфейсе — русские)

import { pgEnum } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------
export const userRole = pgEnum("user_role", ["resident", "admin", "executor"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "rejected", "blocked"]);
export const periodStatus = pgEnum("period_status", [
  "readings_open",
  "readings_closed",
  "charges_formed",
  "published",
]);
export const calcMethod = pgEnum("calc_method", ["area", "cold_water", "hot_water", "fixed"]);
export const paymentStatus = pgEnum("payment_status", ["unpaid", "partially_paid", "paid"]);
export const category = pgEnum("category", [
  "plumbing",
  "electrical",
  "heating",
  "elevator",
  "cleaning",
  "territory",
  "intercom_doors",
  "other",
]);
export const requestLocation = pgEnum("request_location", [
  "apartment",
  "entrance",
  "floor",
  "yard",
  "basement",
  "roof",
  "other",
]);
export const workLocation = pgEnum("work_location", [
  "whole_house",
  "entrance",
  "yard",
  "basement",
  "roof",
  "other",
]);
export const priority = pgEnum("priority", ["urgent", "normal", "low"]);
export const requestStatus = pgEnum("request_status", [
  "new",
  "in_progress",
  "done",
  "rejected",
  "cancelled",
]);
export const workType = pgEnum("work_type", ["planned", "unplanned"]);
export const workStatus = pgEnum("work_status", [
  "planned",
  "in_progress",
  "done",
  "rescheduled",
  "cancelled",
]);
export const importance = pgEnum("importance", ["normal", "important"]); //TODO: подумать надо ли
