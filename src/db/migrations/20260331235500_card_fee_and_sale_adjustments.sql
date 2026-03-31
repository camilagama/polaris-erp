ALTER TABLE "system_settings"
ADD COLUMN IF NOT EXISTS "card_fee_percent" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_minimum_markup_percent_non_negative" CHECK ("minimum_markup_percent" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_ideal_markup_percent_non_negative" CHECK ("ideal_markup_percent" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_card_fee_percent_non_negative" CHECK ("card_fee_percent" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "sales"
ADD COLUMN IF NOT EXISTS "additional_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_additional_amount_non_negative" CHECK ("additional_amount" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_discount_amount_non_negative" CHECK ("discount_amount" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
