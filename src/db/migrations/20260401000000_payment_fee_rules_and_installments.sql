ALTER TABLE "system_settings"
ADD COLUMN IF NOT EXISTS "payment_fee_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "system_settings"
SET "payment_fee_rules" = jsonb_build_array(
  jsonb_build_object(
    'code', 'pix',
    'feePercent', 0,
    'installments', 0,
    'paymentMethod', 'pix'
  ),
  jsonb_build_object(
    'code', '1x',
    'feePercent', COALESCE("card_fee_percent", 0),
    'installments', 1,
    'paymentMethod', 'card'
  )
)
WHERE "payment_fee_rules" = '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "sales"
ADD COLUMN IF NOT EXISTS "payment_installments" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "payment_fee_percent" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
UPDATE "sales"
SET "payment_installments" = CASE
  WHEN "payment_method" = 'card' THEN 1
  ELSE 0
END
WHERE "payment_installments" = 0;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_installments_non_negative" CHECK ("payment_installments" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_fee_percent_non_negative" CHECK ("payment_fee_percent" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_method_installments_valid" CHECK (("payment_method" = 'pix' and "payment_installments" = 0) or ("payment_method" = 'card' and "payment_installments" between 1 and 12));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
