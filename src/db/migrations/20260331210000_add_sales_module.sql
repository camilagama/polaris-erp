DO $$ BEGIN
  CREATE TYPE "sale_status" AS ENUM ('completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales" (
  "id" text PRIMARY KEY NOT NULL,
  "occurred_on" date DEFAULT CURRENT_DATE NOT NULL,
  "status" "sale_status" DEFAULT 'completed' NOT NULL,
  "customer_name" text,
  "notes" text,
  "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" text PRIMARY KEY NOT NULL,
  "sale_id" text NOT NULL,
  "product_id" text NOT NULL,
  "product_name_snapshot" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
  "unit_cost_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
  "line_total" numeric(12, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "sales"
ADD CONSTRAINT "sales_total_amount_non_negative" CHECK ("total_amount" >= 0);
--> statement-breakpoint
ALTER TABLE "sale_items"
ADD CONSTRAINT "sale_items_quantity_positive" CHECK ("quantity" > 0),
ADD CONSTRAINT "sale_items_unit_price_snapshot_non_negative" CHECK ("unit_price_snapshot" >= 0),
ADD CONSTRAINT "sale_items_unit_cost_snapshot_non_negative" CHECK ("unit_cost_snapshot" >= 0),
ADD CONSTRAINT "sale_items_line_total_non_negative" CHECK ("line_total" >= 0);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_occurred_on_idx" ON "sales" USING btree ("occurred_on");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_items_product_id_idx" ON "sale_items" USING btree ("product_id");
