ALTER TABLE "ratings" ADD COLUMN "ip_hash" text;--> statement-breakpoint
CREATE INDEX "ratings_factory_ip_idx" ON "ratings" USING btree ("factory_id","ip_hash");