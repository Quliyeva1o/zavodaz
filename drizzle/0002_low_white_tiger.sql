CREATE TYPE "public"."factory_status" AS ENUM('draft', 'published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."factory_type" AS ENUM('zavod', 'fabrik', 'sex', 'emalatxana', 'kombinat', 'aqropark');--> statement-breakpoint
CREATE TABLE "dict_cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dict_cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dict_industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dict_industries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dict_product_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dict_product_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dict_production_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dict_production_models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "factories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "factory_type" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"industry_id" integer,
	"product_type_id" integer,
	"city_id" integer,
	"production_model_ids" integer[] DEFAULT '{}'::int[] NOT NULL,
	"cooperation" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover_id" uuid,
	"verified" boolean DEFAULT false NOT NULL,
	"status" "factory_status" DEFAULT 'draft' NOT NULL,
	"tariff_code" text DEFAULT 'standart' NOT NULL,
	"tariff_until" timestamp with time zone,
	"tariff_rank" smallint DEFAULT 0 NOT NULL,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"variants" jsonb NOT NULL,
	"blur" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_industry_id_dict_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."dict_industries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_product_type_id_dict_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."dict_product_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_city_id_dict_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."dict_cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "factories_pub_default_idx" ON "factories" USING btree ("tariff_rank" DESC NULLS LAST,"verified" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "factories"."status" = 'published';--> statement-breakpoint
CREATE INDEX "factories_pub_type_idx" ON "factories" USING btree ("type","tariff_rank" DESC NULLS LAST,"verified" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "factories"."status" = 'published';--> statement-breakpoint
CREATE INDEX "factories_pub_rating_idx" ON "factories" USING btree ("rating_avg","rating_count") WHERE "factories"."status" = 'published';--> statement-breakpoint
CREATE INDEX "factories_city_idx" ON "factories" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "factories_industry_idx" ON "factories" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "factories_product_type_idx" ON "factories" USING btree ("product_type_id");--> statement-breakpoint
CREATE INDEX "factories_models_gin" ON "factories" USING gin ("production_model_ids");--> statement-breakpoint
CREATE INDEX "factories_coop_gin" ON "factories" USING gin ("cooperation");