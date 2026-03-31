DO $$ BEGIN
  CREATE TYPE "sale_payment_method" AS ENUM ('pix', 'card');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "sales"
ADD COLUMN IF NOT EXISTS "payment_method" "sale_payment_method" DEFAULT 'pix' NOT NULL,
ADD COLUMN IF NOT EXISTS "freight_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
ADD COLUMN IF NOT EXISTS "fee_amount" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_freight_amount_non_negative" CHECK ("freight_amount" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_fee_amount_non_negative" CHECK ("fee_amount" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_payment_method_idx" ON "sales" USING btree ("payment_method");
