CREATE TYPE "public"."stock_movement_type" AS ENUM('entry', 'write_off', 'sale', 'sale_reversal');--> statement-breakpoint
CREATE TABLE "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "product_id" uuid NOT NULL,
  "type" "stock_movement_type" NOT NULL,
  "source_id" uuid NOT NULL,
  "occurred_on" date NOT NULL,
  "delta" integer NOT NULL,
  "unit_cost_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "stock_movements_delta_non_zero" CHECK ("delta" <> 0),
  CONSTRAINT "stock_movements_unit_cost_non_negative" CHECK ("unit_cost_snapshot" >= 0)
);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_source_unique_idx" ON "stock_movements" USING btree ("organization_id","product_id","type","source_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_occurred_on_idx" ON "stock_movements" USING btree ("organization_id","product_id","occurred_on","created_at");--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_on" date;--> statement-breakpoint
INSERT INTO "stock_movements" ("organization_id", "product_id", "type", "source_id", "occurred_on", "delta", "unit_cost_snapshot")
SELECT "organization_id", "product_id", 'entry', "id", "stocked_on", "quantity", "unit_cost" FROM "product_stock_entries";--> statement-breakpoint
INSERT INTO "stock_movements" ("organization_id", "product_id", "type", "source_id", "occurred_on", "delta", "unit_cost_snapshot")
SELECT "organization_id", "product_id", 'write_off', "id", "happened_on", -"quantity", "unit_cost_snapshot" FROM "product_stock_write_offs";--> statement-breakpoint
INSERT INTO "stock_movements" ("organization_id", "product_id", "type", "source_id", "occurred_on", "delta", "unit_cost_snapshot")
SELECT i."organization_id", i."product_id", 'sale', i."id", s."occurred_on", -i."quantity", i."unit_cost_snapshot" FROM "sale_items" AS i INNER JOIN "sales" AS s ON s."id" = i."sale_id" AND s."organization_id" = i."organization_id";--> statement-breakpoint
INSERT INTO "stock_movements" ("organization_id", "product_id", "type", "source_id", "occurred_on", "delta", "unit_cost_snapshot")
SELECT i."organization_id", i."product_id", 'sale_reversal', i."id", coalesce(date(s."cancelled_at"), s."occurred_on"), i."quantity", i."unit_cost_snapshot" FROM "sale_items" AS i INNER JOIN "sales" AS s ON s."id" = i."sale_id" AND s."organization_id" = i."organization_id" WHERE s."status" = 'cancelled';--> statement-breakpoint
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_movements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "stock_movements_tenant_isolation" ON "stock_movements" AS PERMISSIVE FOR ALL USING ("organization_id" = nullif(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));
