CREATE TABLE "daily_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" text NOT NULL,
	"note" text,
	"date_added" date NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"month" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_expenses" ADD CONSTRAINT "daily_expenses_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_expenses" ADD CONSTRAINT "daily_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD CONSTRAINT "monthly_expenses_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_expenses_household_date_idx" ON "daily_expenses" USING btree ("household_id","date_added");--> statement-breakpoint
CREATE INDEX "daily_expenses_household_id_idx" ON "daily_expenses" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "income_household_id_idx" ON "income" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "income_household_month_uq" ON "income" USING btree ("household_id","month");--> statement-breakpoint
CREATE INDEX "monthly_expenses_household_id_idx" ON "monthly_expenses" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_expenses_household_name_uq" ON "monthly_expenses" USING btree ("household_id","name");--> statement-breakpoint
CREATE INDEX "users_household_id_idx" ON "users" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_household_email_uq" ON "users" USING btree ("household_id","email");