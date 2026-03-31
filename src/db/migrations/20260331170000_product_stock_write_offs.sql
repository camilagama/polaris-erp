CREATE TABLE IF NOT EXISTS "product_stock_write_offs" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"happened_on" date DEFAULT CURRENT_DATE NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"unit_cost_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
