ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "key" text;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "categories"
SET
  "key" = 'others',
  "is_system" = true,
  "name" = 'Outros'
WHERE "name" = 'Outros' OR "key" = 'others';
--> statement-breakpoint
UPDATE "categories"
SET "key" = CONCAT('legacy-', "id")
WHERE "key" IS NULL;
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "key" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_key_unique" ON "categories" USING btree ("key");
--> statement-breakpoint
INSERT INTO "categories" ("id", "key", "name", "description", "is_system", "created_at", "updated_at")
SELECT
  'system-category-others',
  'others',
  'Outros',
  'Categoria padrao protegida pelo sistema.',
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM "categories"
  WHERE "key" = 'others'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "minimum_markup_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
  "ideal_markup_percent" numeric(12, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "system_settings" ("id", "minimum_markup_percent", "ideal_markup_percent", "created_at", "updated_at")
SELECT 'global', '0', '0', now(), now()
WHERE NOT EXISTS (
  SELECT 1
  FROM "system_settings"
  WHERE "id" = 'global'
);
--> statement-breakpoint
UPDATE "products"
SET "category_id" = (
  SELECT "id"
  FROM "categories"
  WHERE "key" = 'others'
  LIMIT 1
)
WHERE "category_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category_id" SET NOT NULL;
