DROP TABLE IF EXISTS "inventory_movements" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "receipts" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sale_items" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sales" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "purchases" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "products" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "accounts" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sessions" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "verifications" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "system_settings" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "import_logs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "imports" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "users" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."inventory_movement_type" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."product_status" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."purchase_status" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."receipt_method" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."receipt_status" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."sale_status" CASCADE;
--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('purchase_in', 'sale_out', 'adjustment_plus', 'adjustment_minus', 'loss', 'damage', 'customer_return', 'cancel_restock');
--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive');
--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('draft', 'registered', 'received', 'canceled');
--> statement-breakpoint
CREATE TYPE "public"."receipt_method" AS ENUM('pix', 'cash', 'card', 'payment_link');
--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('pending', 'partial', 'received', 'canceled', 'refunded', 'chargeback');
--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('draft', 'awaiting_payment', 'partially_paid', 'paid', 'finalized', 'canceled', 'refunded', 'chargeback');
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"purchase_id" integer,
	"sale_id" integer,
	"type" "inventory_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"unit_cost_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"occurred_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"category" varchar(120),
	"notes" text,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"average_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_sold_at" timestamp,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"purchase_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"quantity" integer NOT NULL,
	"supplier_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"card_fee_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_costs_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "purchase_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"received_at" timestamp,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"due_date" timestamp,
	"effective_date" timestamp,
	"gross_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fee_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"method" "receipt_method" NOT NULL,
	"status" "receipt_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_sale_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost_snapshot_unit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost_snapshot_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"channel" varchar(80) NOT NULL,
	"status" "sale_status" DEFAULT 'draft' NOT NULL,
	"items_subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_charged_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"order_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"received_gross_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"received_net_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_margin_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"minimum_margin_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"low_stock_threshold" integer DEFAULT 2 NOT NULL,
	"stale_product_days" integer DEFAULT 45 NOT NULL,
	"estimated_fee_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
