CREATE TYPE "public"."sale_payment_fee_payer" AS ENUM(
  'not_applicable',
  'seller',
  'customer'
);
--> statement-breakpoint
ALTER TABLE "system_settings"
DROP CONSTRAINT "system_settings_card_fee_percent_non_negative";
--> statement-breakpoint
ALTER TABLE "sales"
ADD COLUMN "payment_fee_payer" "sale_payment_fee_payer" DEFAULT 'not_applicable' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales"
ADD COLUMN "charged_amount" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
UPDATE "sales"
SET
  "charged_amount" = "total_amount",
  "payment_fee_payer" = 'not_applicable';
--> statement-breakpoint
UPDATE "system_settings"
SET "payment_fee_rules" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'installments',
        installments,
        'feePercent',
        fee_percent
      )
      ORDER BY installments
    )
    FROM (
      SELECT DISTINCT
        greatest(
          1,
          least(12, COALESCE((rule ->> 'installments')::integer, 1))
        ) AS installments,
        greatest(0, COALESCE((rule ->> 'feePercent')::numeric, 0)) AS fee_percent
      FROM jsonb_array_elements("payment_fee_rules") AS rule
      WHERE COALESCE(rule ->> 'paymentMethod', 'card') = 'card'
        AND COALESCE((rule ->> 'installments')::integer, 0) >= 1
    ) AS normalized_rules
  ),
  jsonb_build_array(
    jsonb_build_object(
      'installments',
      1,
      'feePercent',
      greatest(0, COALESCE("card_fee_percent", 0))
    )
  )
)
WHERE true;
--> statement-breakpoint
ALTER TABLE "system_settings"
DROP COLUMN "card_fee_percent";
--> statement-breakpoint
ALTER TABLE "sales"
ADD CONSTRAINT "sales_payment_method_fee_payer_valid" CHECK (
  ("sales"."payment_method" = 'pix' and "sales"."payment_fee_payer" = 'not_applicable')
  or (
    "sales"."payment_method" = 'card'
    and "sales"."payment_fee_payer" in ('not_applicable', 'seller', 'customer')
  )
);
--> statement-breakpoint
ALTER TABLE "sales"
ADD CONSTRAINT "sales_charged_amount_non_negative" CHECK ("sales"."charged_amount" >= 0);
--> statement-breakpoint
ALTER TABLE "sales"
ADD CONSTRAINT "sales_charged_amount_gte_total_amount" CHECK (
  "sales"."charged_amount" >= "sales"."total_amount"
);
