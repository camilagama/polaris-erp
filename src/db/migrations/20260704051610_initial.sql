CREATE TYPE "public"."goal_display_mode" AS ENUM('percentage', 'absolute');--> statement-breakpoint
CREATE TYPE "public"."goal_metric" AS ENUM('revenue', 'profit', 'sales_count');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_write_off_reason" AS ENUM('adjustment', 'operational');--> statement-breakpoint
CREATE TYPE "public"."sale_payment_fee_payer" AS ENUM('not_applicable', 'seller', 'customer');--> statement-breakpoint
CREATE TYPE "public"."sale_payment_method" AS ENUM('pix', 'card');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text,
	"type" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"metric" "goal_metric" NOT NULL,
	"display_mode" "goal_display_mode" NOT NULL,
	"target_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_value" numeric(12, 2),
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target_value_positive" CHECK ("goals"."target_value" > 0),
	CONSTRAINT "goals_period_end_gte_start" CHECK ("goals"."period_end" >= "goals"."period_start")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"inviter_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_role_known_check" CHECK ("member"."role" in ('owner', 'admin', 'operator'))
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_price_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"previous_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"next_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_price_changes_previous_price_non_negative" CHECK ("product_price_changes"."previous_price" >= 0),
	CONSTRAINT "product_price_changes_next_price_non_negative" CHECK ("product_price_changes"."next_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_stock_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"stocked_on" date DEFAULT CURRENT_DATE NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_stock_entries_quantity_positive" CHECK ("product_stock_entries"."quantity" > 0),
	CONSTRAINT "product_stock_entries_unit_cost_non_negative" CHECK ("product_stock_entries"."unit_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_stock_write_offs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"happened_on" date DEFAULT CURRENT_DATE NOT NULL,
	"quantity" integer NOT NULL,
	"reason" "product_write_off_reason" NOT NULL,
	"notes" text,
	"unit_cost_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_stock_write_offs_quantity_positive" CHECK ("product_stock_write_offs"."quantity" > 0),
	CONSTRAINT "product_stock_write_offs_unit_cost_snapshot_non_negative" CHECK ("product_stock_write_offs"."unit_cost_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"purchased_on" date DEFAULT CURRENT_DATE NOT NULL,
	"category_id" uuid NOT NULL,
	"cost_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"image_version" integer,
	"image_width" integer,
	"image_height" integer,
	"image_blur_data_url" text,
	"image_uploaded_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_cost_price_non_negative" CHECK ("products"."cost_price" >= 0),
	CONSTRAINT "products_price_non_negative" CHECK ("products"."price" >= 0),
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0),
	CONSTRAINT "products_image_version_positive" CHECK ("products"."image_version" is null or "products"."image_version" > 0),
	CONSTRAINT "products_image_width_positive" CHECK ("products"."image_width" is null or "products"."image_width" > 0),
	CONSTRAINT "products_image_height_positive" CHECK ("products"."image_height" is null or "products"."image_height" > 0)
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_cost_snapshot" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_items_quantity_positive" CHECK ("sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_unit_price_snapshot_non_negative" CHECK ("sale_items"."unit_price_snapshot" >= 0),
	CONSTRAINT "sale_items_unit_cost_snapshot_non_negative" CHECK ("sale_items"."unit_cost_snapshot" >= 0),
	CONSTRAINT "sale_items_line_total_non_negative" CHECK ("sale_items"."line_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"occurred_on" date DEFAULT CURRENT_DATE NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"payment_method" "sale_payment_method" DEFAULT 'pix' NOT NULL,
	"payment_installments" integer DEFAULT 0 NOT NULL,
	"payment_fee_payer" "sale_payment_fee_payer" DEFAULT 'not_applicable' NOT NULL,
	"payment_fee_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"customer_name" text,
	"notes" text,
	"freight_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"additional_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fee_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"charged_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_freight_amount_non_negative" CHECK ("sales"."freight_amount" >= 0),
	CONSTRAINT "sales_additional_amount_non_negative" CHECK ("sales"."additional_amount" >= 0),
	CONSTRAINT "sales_discount_amount_non_negative" CHECK ("sales"."discount_amount" >= 0),
	CONSTRAINT "sales_payment_installments_non_negative" CHECK ("sales"."payment_installments" >= 0),
	CONSTRAINT "sales_payment_fee_percent_non_negative" CHECK ("sales"."payment_fee_percent" >= 0),
	CONSTRAINT "sales_payment_method_installments_valid" CHECK (("sales"."payment_method" = 'pix' and "sales"."payment_installments" = 0) or ("sales"."payment_method" = 'card' and "sales"."payment_installments" between 1 and 12)),
	CONSTRAINT "sales_payment_method_fee_payer_valid" CHECK (("sales"."payment_method" = 'pix' and "sales"."payment_fee_payer" = 'not_applicable') or ("sales"."payment_method" = 'card' and "sales"."payment_fee_payer" in ('not_applicable', 'seller', 'customer'))),
	CONSTRAINT "sales_fee_amount_non_negative" CHECK ("sales"."fee_amount" >= 0),
	CONSTRAINT "sales_total_amount_non_negative" CHECK ("sales"."total_amount" >= 0),
	CONSTRAINT "sales_charged_amount_non_negative" CHECK ("sales"."charged_amount" >= 0),
	CONSTRAINT "sales_charged_amount_gte_total_amount" CHECK ("sales"."charged_amount" >= "sales"."total_amount"),
	CONSTRAINT "sales_status_cancelled_at_consistent" CHECK (("sales"."status" = 'completed' and "sales"."cancelled_at" is null) or ("sales"."status" = 'cancelled' and "sales"."cancelled_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"minimum_markup_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ideal_markup_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_fee_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_organization_id_id_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "system_settings_minimum_markup_percent_non_negative" CHECK ("system_settings"."minimum_markup_percent" >= 0),
	CONSTRAINT "system_settings_ideal_markup_percent_non_negative" CHECK ("system_settings"."ideal_markup_percent" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Unique indexes MUST be created before composite FKs that reference them
CREATE UNIQUE INDEX "categories_organization_id_unique_idx" ON "categories" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_organization_id_unique_idx" ON "products" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_organization_id_unique_idx" ON "sales" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD CONSTRAINT "product_stock_entries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD CONSTRAINT "product_stock_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD CONSTRAINT "product_stock_entries_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_category_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_sale_fk" FOREIGN KEY ("organization_id","sale_id") REFERENCES "public"."sales"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_events_organization_created_at_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_organization_key_unique_idx" ON "categories" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_organization_name_unique_idx" ON "categories" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "goals_period_end_idx" ON "goals" USING btree ("organization_id","period_end");--> statement-breakpoint
CREATE INDEX "goals_created_by_user_id_idx" ON "goals" USING btree ("organization_id","created_by_user_id");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_unique_idx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "product_price_changes_product_created_at_idx" ON "product_price_changes" USING btree ("organization_id","product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_price_changes_changed_by_user_id_idx" ON "product_price_changes" USING btree ("changed_by_user_id");--> statement-breakpoint
CREATE INDEX "product_stock_entries_product_stocked_on_idx" ON "product_stock_entries" USING btree ("organization_id","product_id","stocked_on");--> statement-breakpoint
CREATE INDEX "product_stock_write_offs_product_happened_on_idx" ON "product_stock_write_offs" USING btree ("organization_id","product_id","happened_on");--> statement-breakpoint
CREATE INDEX "products_organization_category_id_idx" ON "products" USING btree ("organization_id","category_id");--> statement-breakpoint
CREATE INDEX "products_active_name_idx" ON "products" USING btree ("name") WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "products_archived_idx" ON "products" USING btree ("archived_at") WHERE archived_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("organization_id","sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_idx" ON "sale_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_items_sale_product_unique_idx" ON "sale_items" USING btree ("organization_id","sale_id","product_id");--> statement-breakpoint
CREATE INDEX "sales_organization_status_occurred_on_idx" ON "sales" USING btree ("organization_id","status","occurred_on");--> statement-breakpoint
CREATE INDEX "sales_organization_payment_method_occurred_on_idx" ON "sales" USING btree ("organization_id","payment_method","occurred_on");--> statement-breakpoint
CREATE INDEX "sales_organization_occurred_on_created_at_idx" ON "sales" USING btree ("organization_id","occurred_on","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_active_organization_id_idx" ON "sessions" USING btree ("active_organization_id");