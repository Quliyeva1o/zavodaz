DROP INDEX "factories_pub_rating_idx";--> statement-breakpoint
DROP INDEX "factories_pub_default_idx";--> statement-breakpoint
DROP INDEX "factories_pub_type_idx";--> statement-breakpoint
CREATE INDEX "factories_pub_rating_desc_idx" ON "factories" USING btree ("rating_avg" DESC NULLS FIRST,"rating_count" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "factories"."status" = 'published';--> statement-breakpoint
CREATE INDEX "factories_pub_rating_asc_idx" ON "factories" USING btree ("rating_avg","rating_count" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "factories"."status" = 'published';--> statement-breakpoint
CREATE INDEX "factories_pub_default_idx" ON "factories" USING btree ("tariff_rank" DESC NULLS FIRST,"verified" DESC NULLS FIRST,"created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "factories"."status" = 'published';--> statement-breakpoint
CREATE INDEX "factories_pub_type_idx" ON "factories" USING btree ("type","tariff_rank" DESC NULLS FIRST,"verified" DESC NULLS FIRST,"created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "factories"."status" = 'published';