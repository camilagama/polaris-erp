CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "categories_name_trgm_idx" ON "categories" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_active_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops) WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "products_archived_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops) WHERE archived_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sales_customer_name_trgm_idx" ON "sales" USING gin ("customer_name" gin_trgm_ops) WHERE customer_name IS NOT NULL;
