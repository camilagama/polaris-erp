CREATE TABLE IF NOT EXISTS "organization" (
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
CREATE TABLE IF NOT EXISTS "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation" (
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
CREATE TABLE IF NOT EXISTS "audit_events" (
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
INSERT INTO "organization" ("id", "name", "slug", "status")
VALUES ('org_dg_imports', 'DG Imports', 'dg-imports', 'active')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "member" ("id", "organization_id", "user_id", "role")
SELECT gen_random_uuid()::text, 'org_dg_imports', "id", 'owner'
FROM "users"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_key_unique";
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "products_category_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "sales_status_occurred_on_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "sales_payment_method_occurred_on_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "sales_occurred_on_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "product_price_changes_product_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "product_stock_entries_product_stocked_on_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "product_stock_write_offs_product_happened_on_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "sale_items_sale_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "sale_items_product_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "sale_items_sale_product_unique_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "goals_status_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "goals_period_end_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "goals_created_by_user_id_idx";
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "active_organization_id" text;
--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint
UPDATE "categories" SET "organization_id" = 'org_dg_imports';
--> statement-breakpoint
UPDATE "goals" SET "organization_id" = 'org_dg_imports';
--> statement-breakpoint
UPDATE "products" SET "organization_id" = 'org_dg_imports';
--> statement-breakpoint
UPDATE "sales" SET "organization_id" = 'org_dg_imports';
--> statement-breakpoint
UPDATE "product_price_changes"
SET "organization_id" = COALESCE(
	(SELECT "products"."organization_id" FROM "products" WHERE "products"."id" = "product_price_changes"."product_id"),
	'org_dg_imports'
);
--> statement-breakpoint
UPDATE "product_stock_entries"
SET "organization_id" = COALESCE(
	(SELECT "products"."organization_id" FROM "products" WHERE "products"."id" = "product_stock_entries"."product_id"),
	'org_dg_imports'
);
--> statement-breakpoint
UPDATE "product_stock_write_offs"
SET "organization_id" = COALESCE(
	(SELECT "products"."organization_id" FROM "products" WHERE "products"."id" = "product_stock_write_offs"."product_id"),
	'org_dg_imports'
);
--> statement-breakpoint
UPDATE "sale_items"
SET "organization_id" = COALESCE(
	(SELECT "sales"."organization_id" FROM "sales" WHERE "sales"."id" = "sale_items"."sale_id"),
	'org_dg_imports'
);
--> statement-breakpoint
UPDATE "sessions" SET "active_organization_id" = 'org_dg_imports';
--> statement-breakpoint
UPDATE "system_settings" SET "organization_id" = 'org_dg_imports';
--> statement-breakpoint
INSERT INTO "system_settings" (
	"id",
	"minimum_markup_percent",
	"ideal_markup_percent",
	"payment_fee_rules",
	"organization_id",
	"created_at",
	"updated_at"
)
SELECT 'global', '0', '0', '[]'::jsonb, 'org_dg_imports', now(), now()
WHERE NOT EXISTS (
	SELECT 1
	FROM "system_settings"
	WHERE "organization_id" = 'org_dg_imports'
		AND "id" = 'global'
);
--> statement-breakpoint
INSERT INTO "categories" (
	"id",
	"key",
	"name",
	"description",
	"is_system",
	"organization_id",
	"created_at",
	"updated_at"
)
SELECT gen_random_uuid(), 'others', 'Outros', 'Categoria padrao protegida pelo sistema.', true, 'org_dg_imports', now(), now()
WHERE NOT EXISTS (
	SELECT 1
	FROM "categories"
	WHERE "organization_id" = 'org_dg_imports'
		AND "key" = 'others'
);
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_price_changes" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_stock_entries" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
DO $$
DECLARE pk_name text;
BEGIN
	SELECT constraint_name INTO pk_name
	FROM information_schema.table_constraints
	WHERE table_schema = 'public'
		AND table_name = 'system_settings'
		AND constraint_type = 'PRIMARY KEY';

	IF pk_name IS NOT NULL THEN
		EXECUTE format('ALTER TABLE "system_settings" DROP CONSTRAINT %I', pk_name);
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_id_pk" PRIMARY KEY("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_organization_id_unique_idx" ON "categories" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "products_organization_id_unique_idx" ON "products" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_organization_id_unique_idx" ON "sales" USING btree ("organization_id","id");
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD CONSTRAINT "product_stock_entries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_category_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_stock_entries" ADD CONSTRAINT "product_stock_entries_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" ADD CONSTRAINT "product_stock_write_offs_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_sale_fk" FOREIGN KEY ("organization_id","sale_id") REFERENCES "public"."sales"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_events_organization_created_at_idx" ON "audit_events" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "invitation" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_unique_idx" ON "member" USING btree ("organization_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_organization_key_unique_idx" ON "categories" USING btree ("organization_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_organization_name_unique_idx" ON "categories" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE INDEX "products_organization_category_id_idx" ON "products" USING btree ("organization_id","category_id");
--> statement-breakpoint
CREATE INDEX "product_price_changes_product_created_at_idx" ON "product_price_changes" USING btree ("organization_id","product_id","created_at");
--> statement-breakpoint
CREATE INDEX "product_stock_entries_product_stocked_on_idx" ON "product_stock_entries" USING btree ("organization_id","product_id","stocked_on");
--> statement-breakpoint
CREATE INDEX "product_stock_write_offs_product_happened_on_idx" ON "product_stock_write_offs" USING btree ("organization_id","product_id","happened_on");
--> statement-breakpoint
CREATE INDEX "sales_organization_status_occurred_on_idx" ON "sales" USING btree ("organization_id","status","occurred_on");
--> statement-breakpoint
CREATE INDEX "sales_organization_payment_method_occurred_on_idx" ON "sales" USING btree ("organization_id","payment_method","occurred_on");
--> statement-breakpoint
CREATE INDEX "sales_organization_occurred_on_created_at_idx" ON "sales" USING btree ("organization_id","occurred_on","created_at");
--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("organization_id","sale_id");
--> statement-breakpoint
CREATE INDEX "sale_items_product_id_idx" ON "sale_items" USING btree ("organization_id","product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sale_items_sale_product_unique_idx" ON "sale_items" USING btree ("organization_id","sale_id","product_id");
--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "goals_period_end_idx" ON "goals" USING btree ("organization_id","period_end");
--> statement-breakpoint
CREATE INDEX "goals_created_by_user_id_idx" ON "goals" USING btree ("organization_id","created_by_user_id");
--> statement-breakpoint
CREATE INDEX "sessions_active_organization_id_idx" ON "sessions" USING btree ("active_organization_id");
