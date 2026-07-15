ALTER TABLE "products" ADD COLUMN "soft_deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "soft_deleted_by_user_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "soft_delete_reason" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_soft_deleted_by_user_id_users_id_fk" FOREIGN KEY ("soft_deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_soft_delete_metadata_consistent" CHECK (("soft_deleted_at" is null and "soft_deleted_by_user_id" is null and "soft_delete_reason" is null) or ("soft_deleted_at" is not null and "soft_deleted_by_user_id" is not null and length(btrim("soft_delete_reason")) > 0));--> statement-breakpoint
ALTER TABLE "product_price_changes" DROP CONSTRAINT "product_price_changes_product_id_products_id_fk";--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_entries" DROP CONSTRAINT "product_stock_entries_product_id_products_id_fk";--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD CONSTRAINT "product_stock_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" DROP CONSTRAINT "product_stock_write_offs_product_id_products_id_fk";--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_product_id_products_id_fk";--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP INDEX "products_active_list_idx";--> statement-breakpoint
CREATE INDEX "products_active_list_idx" ON "products" USING btree ("organization_id","name","created_at","id") WHERE archived_at IS NULL AND soft_deleted_at IS NULL;--> statement-breakpoint
DROP INDEX "products_archived_list_idx";--> statement-breakpoint
CREATE INDEX "products_archived_list_idx" ON "products" USING btree ("organization_id","name","created_at","id") WHERE archived_at IS NOT NULL AND soft_deleted_at IS NULL;--> statement-breakpoint
DROP INDEX "products_active_name_idx";--> statement-breakpoint
CREATE INDEX "products_active_name_idx" ON "products" USING btree ("name") WHERE archived_at IS NULL AND soft_deleted_at IS NULL;--> statement-breakpoint
DROP INDEX "products_active_name_trgm_idx";--> statement-breakpoint
CREATE INDEX "products_active_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops) WHERE archived_at IS NULL AND soft_deleted_at IS NULL;--> statement-breakpoint
DROP INDEX "products_archived_name_trgm_idx";--> statement-breakpoint
CREATE INDEX "products_archived_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops) WHERE archived_at IS NOT NULL AND soft_deleted_at IS NULL;--> statement-breakpoint
DROP INDEX "products_archived_idx";--> statement-breakpoint
CREATE INDEX "products_archived_idx" ON "products" USING btree ("archived_at") WHERE archived_at IS NOT NULL AND soft_deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "products_soft_deleted_idx" ON "products" USING btree ("organization_id","soft_deleted_at") WHERE soft_deleted_at IS NOT NULL;
