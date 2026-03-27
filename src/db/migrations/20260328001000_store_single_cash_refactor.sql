ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'initial_stock';
--> statement-breakpoint
DO $$
BEGIN
	CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'refunded', 'chargeback');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	CREATE TYPE "public"."payment_method_type" AS ENUM('pix', 'cash', 'card_debit', 'card_credit', 'payment_link', 'bank_transfer', 'other');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	CREATE TYPE "public"."payment_event_status" AS ENUM('pending', 'canceled', 'confirmed');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	CREATE TYPE "public"."payment_event_type" AS ENUM('payment', 'refund', 'chargeback');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" varchar(80);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" varchar(120);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "minimum_stock" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_status" "public"."payment_status" DEFAULT 'unpaid' NOT NULL;
--> statement-breakpoint
UPDATE "sales"
SET "payment_status" = CASE
	WHEN "status"::text = 'chargeback' THEN 'chargeback'::"public"."payment_status"
	WHEN "status"::text = 'refunded' THEN 'refunded'::"public"."payment_status"
	WHEN "status"::text = 'paid' THEN 'paid'::"public"."payment_status"
	WHEN "status"::text = 'partially_paid' THEN 'partially_paid'::"public"."payment_status"
	ELSE 'unpaid'::"public"."payment_status"
END;
--> statement-breakpoint
DO $$
BEGIN
	CREATE TYPE "public"."sale_status_next" AS ENUM('draft', 'finalized', 'canceled');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "sales"
	ALTER COLUMN "status" TYPE "public"."sale_status_next"
	USING (
		CASE
			WHEN "status"::text = 'canceled' THEN 'canceled'
			WHEN "status"::text = 'draft' THEN 'draft'
			ELSE 'finalized'
		END
	)::"public"."sale_status_next";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."sale_status";
--> statement-breakpoint
ALTER TYPE "public"."sale_status_next" RENAME TO "sale_status";
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "status" SET DEFAULT 'finalized';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"due_date" timestamp,
	"effective_date" timestamp,
	"gross_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fee_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"type" "public"."payment_event_type" DEFAULT 'payment' NOT NULL,
	"method" "public"."payment_method_type" NOT NULL,
	"status" "public"."payment_event_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "payment_events_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "payment_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipts') THEN
		INSERT INTO "payment_events" (
			"id",
			"sale_id",
			"due_date",
			"effective_date",
			"gross_amount",
			"fee_amount",
			"net_amount",
			"type",
			"method",
			"status",
			"notes",
			"created_by_user_id",
			"created_at",
			"updated_at"
		)
		SELECT
			"id",
			"sale_id",
			"due_date",
			"effective_date",
			"gross_amount",
			"fee_amount",
			CASE
				WHEN "status"::text = 'refunded' OR "status"::text = 'chargeback'
					THEN "gross_amount" + "fee_amount"
				ELSE "gross_amount" - "fee_amount"
			END,
			CASE
				WHEN "status"::text = 'refunded' THEN 'refund'::"public"."payment_event_type"
				WHEN "status"::text = 'chargeback' THEN 'chargeback'::"public"."payment_event_type"
				ELSE 'payment'::"public"."payment_event_type"
			END,
			CASE
				WHEN "method"::text = 'pix' THEN 'pix'::"public"."payment_method_type"
				WHEN "method"::text = 'cash' THEN 'cash'::"public"."payment_method_type"
				WHEN "method"::text = 'card' THEN 'card_credit'::"public"."payment_method_type"
				WHEN "method"::text = 'payment_link' THEN 'payment_link'::"public"."payment_method_type"
				ELSE 'other'::"public"."payment_method_type"
			END,
			CASE
				WHEN "status"::text = 'pending' THEN 'pending'::"public"."payment_event_status"
				WHEN "status"::text = 'canceled' THEN 'canceled'::"public"."payment_event_status"
				ELSE 'confirmed'::"public"."payment_event_status"
			END,
			"notes",
			"created_by_user_id",
			"created_at",
			"updated_at"
		FROM "receipts";
	END IF;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "receipts";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."receipt_method";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."receipt_status";
--> statement-breakpoint
WITH payment_summary AS (
	SELECT
		"sale_id",
		COALESCE(SUM(CASE
			WHEN "status" = 'confirmed' AND "type" = 'payment' THEN "gross_amount"
			WHEN "status" = 'confirmed' AND "type" IN ('refund', 'chargeback') THEN -"gross_amount"
			ELSE 0
		END), 0) AS "signed_gross",
		COALESCE(SUM(CASE
			WHEN "status" = 'confirmed' AND "type" = 'payment' THEN "net_amount"
			WHEN "status" = 'confirmed' AND "type" IN ('refund', 'chargeback') THEN -"net_amount"
			ELSE 0
		END), 0) AS "signed_net",
		COALESCE(SUM(CASE
			WHEN "status" = 'confirmed' AND "type" = 'refund' THEN "gross_amount"
			ELSE 0
		END), 0) AS "refund_gross",
		COALESCE(SUM(CASE
			WHEN "status" = 'confirmed' AND "type" = 'chargeback' THEN "gross_amount"
			ELSE 0
		END), 0) AS "chargeback_gross"
	FROM "payment_events"
	GROUP BY "sale_id"
)
UPDATE "sales"
SET
	"received_gross_total" = payment_summary."signed_gross",
	"received_net_total" = payment_summary."signed_net",
	"payment_status" = CASE
		WHEN payment_summary."chargeback_gross" > 0 AND payment_summary."signed_gross" <= 0
			THEN 'chargeback'::"public"."payment_status"
		WHEN payment_summary."refund_gross" > 0 AND payment_summary."signed_gross" <= 0
			THEN 'refunded'::"public"."payment_status"
		WHEN payment_summary."signed_gross" <= 0
			THEN 'unpaid'::"public"."payment_status"
		WHEN payment_summary."chargeback_gross" > 0
			THEN 'chargeback'::"public"."payment_status"
		WHEN payment_summary."signed_gross" < "sales"."order_total"
			THEN 'partially_paid'::"public"."payment_status"
		ELSE 'paid'::"public"."payment_status"
	END
FROM payment_summary
WHERE "sales"."id" = payment_summary."sale_id";
