DO $$ BEGIN
  CREATE TYPE "product_write_off_reason" AS ENUM ('adjustment', 'damage', 'loss');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "products"
SET
  "cost_price" = GREATEST("cost_price", 0),
  "price" = GREATEST("price", 0),
  "stock" = GREATEST("stock", 0);
--> statement-breakpoint
UPDATE "product_stock_entries"
SET
  "quantity" = GREATEST("quantity", 1),
  "unit_cost" = GREATEST("unit_cost", 0);
--> statement-breakpoint
UPDATE "product_stock_write_offs"
SET
  "quantity" = GREATEST("quantity", 1),
  "unit_cost_snapshot" = GREATEST("unit_cost_snapshot", 0),
  "reason" = CASE
    WHEN "reason" IN ('adjustment', 'damage', 'loss') THEN "reason"
    ELSE 'adjustment'
  END;
--> statement-breakpoint
ALTER TABLE "product_stock_write_offs"
ALTER COLUMN "reason" TYPE "product_write_off_reason"
USING "reason"::"product_write_off_reason";
--> statement-breakpoint
ALTER TABLE "products"
ADD CONSTRAINT "products_cost_price_non_negative" CHECK ("cost_price" >= 0),
ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0),
ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0);
--> statement-breakpoint
ALTER TABLE "product_stock_entries"
ADD CONSTRAINT "product_stock_entries_quantity_positive" CHECK ("quantity" > 0),
ADD CONSTRAINT "product_stock_entries_unit_cost_non_negative" CHECK ("unit_cost" >= 0);
--> statement-breakpoint
ALTER TABLE "product_stock_write_offs"
ADD CONSTRAINT "product_stock_write_offs_quantity_positive" CHECK ("quantity" > 0),
ADD CONSTRAINT "product_stock_write_offs_unit_cost_snapshot_non_negative" CHECK ("unit_cost_snapshot" >= 0);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_archived_at_idx" ON "products" USING btree ("archived_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_stock_entries_product_stocked_on_idx" ON "product_stock_entries" USING btree ("product_id", "stocked_on");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_stock_write_offs_product_happened_on_idx" ON "product_stock_write_offs" USING btree ("product_id", "happened_on");
