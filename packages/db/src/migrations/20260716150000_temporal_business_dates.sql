ALTER TABLE "products" ALTER COLUMN "purchased_on" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;--> statement-breakpoint
ALTER TABLE "product_stock_entries" ALTER COLUMN "stocked_on" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ALTER COLUMN "happened_on" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "occurred_on" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;--> statement-breakpoint
UPDATE "sales"
SET "cancelled_on" = ("cancelled_at" AT TIME ZONE 'America/Sao_Paulo')::date
WHERE "status" = 'cancelled'
  AND "cancelled_at" IS NOT NULL
  AND "cancelled_on" IS NULL;--> statement-breakpoint
UPDATE "stock_movements" AS movement
SET "occurred_on" = (sale."cancelled_at" AT TIME ZONE 'America/Sao_Paulo')::date
FROM "sale_items" AS item
INNER JOIN "sales" AS sale
  ON sale."id" = item."sale_id"
  AND sale."organization_id" = item."organization_id"
WHERE movement."organization_id" = item."organization_id"
  AND movement."product_id" = item."product_id"
  AND movement."source_id" = item."id"
  AND movement."type" = 'sale_reversal'
  AND sale."status" = 'cancelled'
  AND sale."cancelled_at" IS NOT NULL
  AND movement."occurred_on" IS DISTINCT FROM (sale."cancelled_at" AT TIME ZONE 'America/Sao_Paulo')::date;--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_status_cancelled_at_consistent";--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_status_cancellation_consistent" CHECK (("status" = 'completed' AND "cancelled_at" IS NULL AND "cancelled_on" IS NULL) OR ("status" = 'cancelled' AND "cancelled_at" IS NOT NULL AND "cancelled_on" IS NOT NULL));
