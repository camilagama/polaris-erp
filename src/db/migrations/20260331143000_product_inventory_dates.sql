ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "purchased_on" date DEFAULT CURRENT_DATE NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_stock_entries"
ADD COLUMN IF NOT EXISTS "stocked_on" date DEFAULT CURRENT_DATE NOT NULL;
