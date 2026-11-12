CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"topic_id" text NOT NULL,
	"topic_label" text NOT NULL,
	"message" text NOT NULL,
	"lang" text NOT NULL,
	"ip_hash" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" jsonb NOT NULL,
	"answer" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"key" text PRIMARY KEY NOT NULL,
	"title" jsonb NOT NULL,
	"intro" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"seo" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_plans" (
	"code" text PRIMARY KEY NOT NULL,
	"icon" text NOT NULL,
	"name" jsonb NOT NULL,
	"price_month_q" integer NOT NULL,
	"price_year_q" integer,
	"features" jsonb NOT NULL,
	"limits" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" USING btree ("created_at");