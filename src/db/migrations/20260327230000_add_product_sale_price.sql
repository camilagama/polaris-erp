ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "sale_price" numeric(12, 2) DEFAULT '0' NOT NULL;
