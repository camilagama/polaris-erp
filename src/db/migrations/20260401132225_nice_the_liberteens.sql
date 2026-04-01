UPDATE "sales"
SET "cancelled_at" = COALESCE("cancelled_at", "updated_at", "created_at", now())
WHERE "status" = 'cancelled'
  AND "cancelled_at" IS NULL;
--> statement-breakpoint
UPDATE "sales"
SET "cancelled_at" = NULL
WHERE "status" = 'completed'
  AND "cancelled_at" IS NOT NULL;
--> statement-breakpoint
WITH duplicated_items AS (
  SELECT
    "sale_id",
    "product_id",
    MIN("id") AS "keep_id",
    SUM("quantity") AS "total_quantity",
    SUM("line_total") AS "total_line_total"
  FROM "sale_items"
  GROUP BY "sale_id", "product_id"
  HAVING COUNT(*) > 1
)
UPDATE "sale_items" AS "target"
SET
  "quantity" = duplicated_items."total_quantity",
  "line_total" = duplicated_items."total_line_total",
  "updated_at" = now()
FROM duplicated_items
WHERE "target"."id" = duplicated_items."keep_id";
--> statement-breakpoint
WITH duplicated_items AS (
  SELECT
    "sale_id",
    "product_id",
    MIN("id") AS "keep_id"
  FROM "sale_items"
  GROUP BY "sale_id", "product_id"
  HAVING COUNT(*) > 1
)
DELETE FROM "sale_items" AS "target"
USING duplicated_items
WHERE "target"."sale_id" = duplicated_items."sale_id"
  AND "target"."product_id" = duplicated_items."product_id"
  AND "target"."id" <> duplicated_items."keep_id";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_status_cancelled_at_consistent" CHECK (("status" = 'completed' and "cancelled_at" is null) or ("status" = 'cancelled' and "cancelled_at" is not null));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sale_items_sale_product_unique_idx" ON "sale_items" USING btree ("sale_id","product_id");
