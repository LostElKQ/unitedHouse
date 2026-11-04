CREATE TYPE "public"."calc_method" AS ENUM('area', 'cold_water', 'hot_water', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('plumbing', 'electrical', 'heating', 'elevator', 'cleaning', 'territory', 'intercom_doors', 'other');--> statement-breakpoint
CREATE TYPE "public"."importance" AS ENUM('normal', 'important');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partially_paid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('readings_open', 'readings_closed', 'charges_formed', 'published');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('urgent', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."request_location" AS ENUM('apartment', 'entrance', 'floor', 'yard', 'basement', 'roof', 'other');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('new', 'in_progress', 'done', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('resident', 'admin', 'executor');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'rejected', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."work_location" AS ENUM('whole_house', 'entrance', 'yard', 'basement', 'roof', 'other');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('planned', 'in_progress', 'done', 'rescheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."work_type" AS ENUM('planned', 'unplanned');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_account_uq" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer,
	"title" varchar(150) NOT NULL,
	"body" varchar(5000) NOT NULL,
	"importance" "importance" DEFAULT 'normal' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"actual_until" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "apartments" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" varchar(10) NOT NULL,
	"entrance" smallint NOT NULL,
	"floor" smallint NOT NULL,
	"area" numeric(8, 2) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"initial_cold" numeric(12, 3) DEFAULT '0' NOT NULL,
	"initial_hot" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apartments_number_unique" UNIQUE("number"),
	CONSTRAINT "apartments_account_number_unique" UNIQUE("account_number"),
	CONSTRAINT "apartments_entrance" CHECK ("apartments"."entrance" >= 1),
	CONSTRAINT "apartments_floor" CHECK ("apartments"."floor" >= 1),
	CONSTRAINT "apartments_area" CHECK ("apartments"."area" > 0),
	CONSTRAINT "apartments_account_number" CHECK ("apartments"."account_number" ~ '^\d{1,20}$'),
	CONSTRAINT "apartments_initial_readings" CHECK ("apartments"."initial_cold" >= 0 AND "apartments"."initial_hot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer,
	"work_id" integer,
	"file_path" varchar(500) NOT NULL,
	"mime_type" varchar(20) NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_mime_type" CHECK ("attachments"."mime_type" IN ('image/jpeg', 'image/png')),
	CONSTRAINT "attachments_size" CHECK ("attachments"."size_bytes" > 0 AND "attachments"."size_bytes" <= 5242880),
	CONSTRAINT "attachments_one_owner" CHECK (("attachments"."request_id" IS NULL) <> ("attachments"."work_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"readings_start" date NOT NULL,
	"readings_end" date NOT NULL,
	"status" "period_status" DEFAULT 'readings_open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"charges_formed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "billing_periods_year_month_uq" UNIQUE("year","month"),
	CONSTRAINT "billing_periods_year" CHECK ("billing_periods"."year" BETWEEN 2020 AND 2100),
	CONSTRAINT "billing_periods_month" CHECK ("billing_periods"."month" BETWEEN 1 AND 12),
	CONSTRAINT "billing_periods_readings_dates" CHECK ("billing_periods"."readings_end" >= "billing_periods"."readings_start"
		AND date_trunc('month', "billing_periods"."readings_start") = make_date("billing_periods"."year", "billing_periods"."month", 1)
		AND date_trunc('month', "billing_periods"."readings_end") = make_date("billing_periods"."year", "billing_periods"."month", 1))
);
--> statement-breakpoint
CREATE TABLE "charge_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"charge_id" integer NOT NULL,
	"tariff_id" integer,
	"service" varchar(100) NOT NULL,
	"calc_method" "calc_method" NOT NULL,
	"volume" numeric(12, 3) NOT NULL,
	"unit" varchar(10) NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "charge_lines_values" CHECK ("charge_lines"."volume" >= 0 AND "charge_lines"."rate" > 0 AND "charge_lines"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartment_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_at" date,
	"payment_marked_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charges_apartment_period_uq" UNIQUE("apartment_id","period_id"),
	CONSTRAINT "charges_amounts" CHECK ("charges"."total" >= 0 AND "charges"."paid_amount" >= 0),
	CONSTRAINT "charges_payment_status" CHECK (
		("charges"."payment_status" = 'unpaid' AND "charges"."paid_amount" = 0)
		OR ("charges"."payment_status" = 'partially_paid' AND "charges"."paid_amount" > 0 AND "charges"."paid_amount" < "charges"."total")
		OR ("charges"."payment_status" = 'paid' AND "charges"."paid_amount" >= "charges"."total")),
	CONSTRAINT "charges_paid_at" CHECK (("charges"."paid_amount" = 0) = ("charges"."paid_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"text" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_text_not_empty" CHECK (char_length("comments"."text") > 0)
);
--> statement-breakpoint
CREATE TABLE "hoa_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" varchar(255) DEFAULT '' NOT NULL,
	"inn" varchar(10),
	"kpp" varchar(9),
	"address" varchar(255) DEFAULT '' NOT NULL,
	"chairman_name" varchar(150),
	"bank_account" varchar(20),
	"bank_name" varchar(255),
	"bik" varchar(9),
	"corr_account" varchar(20),
	"board_phone" varchar(18),
	"emergency_phone" varchar(18),
	"readings_start_day" smallint DEFAULT 20 NOT NULL,
	"readings_end_day" smallint DEFAULT 25 NOT NULL,
	"reaction_hours_urgent" integer DEFAULT 24 NOT NULL,
	"reaction_hours_normal" integer DEFAULT 168 NOT NULL,
	"reaction_hours_low" integer,
	"timezone" varchar(64) DEFAULT 'Europe/Moscow' NOT NULL,
	"maintenance_protocol_no" varchar(50),
	"maintenance_protocol_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hoa_settings_single_row" CHECK ("hoa_settings"."id" = 1),
	CONSTRAINT "hoa_settings_inn" CHECK ("hoa_settings"."inn" ~ '^\d{10}$'),
	CONSTRAINT "hoa_settings_kpp" CHECK ("hoa_settings"."kpp" ~ '^\d{9}$'),
	CONSTRAINT "hoa_settings_bank_account" CHECK ("hoa_settings"."bank_account" ~ '^\d{20}$'),
	CONSTRAINT "hoa_settings_bik" CHECK ("hoa_settings"."bik" ~ '^\d{9}$'),
	CONSTRAINT "hoa_settings_corr_account" CHECK ("hoa_settings"."corr_account" ~ '^\d{20}$'),
	CONSTRAINT "hoa_settings_readings_days" CHECK ("hoa_settings"."readings_start_day" BETWEEN 1 AND 28 AND "hoa_settings"."readings_end_day" BETWEEN 1 AND 28 AND "hoa_settings"."readings_end_day" >= "hoa_settings"."readings_start_day"),
	CONSTRAINT "hoa_settings_reaction_hours" CHECK ("hoa_settings"."reaction_hours_urgent" > 0 AND "hoa_settings"."reaction_hours_normal" > 0 AND ("hoa_settings"."reaction_hours_low" IS NULL OR "hoa_settings"."reaction_hours_low" > 0))
);
--> statement-breakpoint
CREATE TABLE "maintenance_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"periodicity" varchar(100) NOT NULL,
	"annual_cost" numeric(12, 2),
	"note" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "maintenance_items_cost" CHECK ("maintenance_items"."annual_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meter_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartment_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"cold_value" numeric(12, 3) NOT NULL,
	"hot_value" numeric(12, 3) NOT NULL,
	"entered_by" integer NOT NULL,
	"entered_by_admin" boolean DEFAULT false NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meter_readings_apartment_period_uq" UNIQUE("apartment_id","period_id"),
	CONSTRAINT "meter_readings_values" CHECK ("meter_readings"."cold_value" >= 0 AND "meter_readings"."hot_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "request_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"changed_by" integer,
	"old_status" "request_status",
	"new_status" "request_status",
	"old_priority" "priority",
	"new_priority" "priority",
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "requests_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"apartment_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"category" "category" NOT NULL,
	"location" "request_location" NOT NULL,
	"location_detail" varchar(100),
	"description" varchar(2000) NOT NULL,
	"marked_urgent" boolean DEFAULT false NOT NULL,
	"priority" "priority" DEFAULT 'normal' NOT NULL,
	"status" "request_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"taken_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "requests_number_unique" UNIQUE("number"),
	CONSTRAINT "requests_description_length" CHECK (char_length("requests"."description") >= 10)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tariffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" varchar(100) NOT NULL,
	"calc_method" "calc_method" NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tariffs_rate" CHECK ("tariffs"."rate" > 0),
	CONSTRAINT "tariffs_dates" CHECK ("tariffs"."valid_to" IS NULL OR "tariffs"."valid_to" >= "tariffs"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(254) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"apartment_id" integer,
	"phone" varchar(18),
	"role" "user_role" DEFAULT 'resident' NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" varchar(500),
	"must_change_password" boolean DEFAULT false NOT NULL,
	"pd_consent_at" timestamp with time zone,
	"failed_login_attempts" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_format" CHECK ("users"."phone" ~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$'),
	CONSTRAINT "users_resident_has_apartment" CHECK (("users"."role" = 'resident') = ("users"."apartment_id" IS NOT NULL)),
	CONSTRAINT "users_rejection_reason" CHECK ("users"."status" <> 'rejected' OR "users"."rejection_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_reschedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"old_date" date NOT NULL,
	"new_date" date NOT NULL,
	"reason" varchar(500) NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_reschedules_dates" CHECK ("work_reschedules"."new_date" <> "work_reschedules"."old_date"),
	CONSTRAINT "work_reschedules_reason" CHECK (char_length("work_reschedules"."reason") > 0)
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer,
	"title" varchar(150) NOT NULL,
	"type" "work_type" NOT NULL,
	"category" "category" NOT NULL,
	"location" "work_location" NOT NULL,
	"location_detail" varchar(100),
	"work_date" date NOT NULL,
	"time_start" time,
	"time_end" time,
	"executor_id" integer,
	"contractor" varchar(100),
	"description" text,
	"priority" "priority",
	"status" "work_status" DEFAULT 'planned' NOT NULL,
	"report" varchar(2000),
	"completed_on" date,
	"completed_by" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "works_time_range" CHECK ("works"."time_end" IS NULL OR "works"."time_start" IS NULL OR "works"."time_end" > "works"."time_start"),
	CONSTRAINT "works_executor_or_contractor" CHECK ("works"."executor_id" IS NULL OR "works"."contractor" IS NULL),
	CONSTRAINT "works_priority_only_unplanned" CHECK ("works"."type" = 'unplanned' OR "works"."priority" IS NULL),
	CONSTRAINT "works_done_has_report" CHECK ("works"."status" <> 'done' OR ("works"."report" IS NOT NULL AND "works"."completed_on" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_tariff_id_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_period_id_billing_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."billing_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_payment_marked_by_users_id_fk" FOREIGN KEY ("payment_marked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_period_id_billing_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."billing_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_reschedules" ADD CONSTRAINT "work_reschedules_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_reschedules" ADD CONSTRAINT "work_reschedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_executor_id_users_id_fk" FOREIGN KEY ("executor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcements_feed_idx" ON "announcements" USING btree ("pinned" DESC NULLS LAST,"created_at" DESC NULLS LAST) WHERE "announcements"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "attachments_request_idx" ON "attachments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "attachments_work_idx" ON "attachments" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_periods_one_open_uq" ON "billing_periods" USING btree ((true)) WHERE "billing_periods"."status" <> 'published';--> statement-breakpoint
CREATE INDEX "charge_lines_charge_idx" ON "charge_lines" USING btree ("charge_id");--> statement-breakpoint
CREATE INDEX "charges_period_idx" ON "charges" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "comments_request_idx" ON "comments" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "meter_readings_period_idx" ON "meter_readings" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "request_history_request_idx" ON "request_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "requests_apartment_idx" ON "requests" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "requests_status_idx" ON "requests" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_apartment_idx" ON "users" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "work_reschedules_work_idx" ON "work_reschedules" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "works_date_idx" ON "works" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "works_executor_idx" ON "works" USING btree ("executor_id","work_date");--> statement-breakpoint
CREATE INDEX "works_request_idx" ON "works" USING btree ("request_id");