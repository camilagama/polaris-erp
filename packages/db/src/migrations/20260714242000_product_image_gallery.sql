CREATE TABLE "product_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "product_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "version" integer NOT NULL,
  "blur_data_url" text NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "removed_at" timestamp with time zone,
  CONSTRAINT "product_images_position_non_negative" CHECK ("position" >= 0),
  CONSTRAINT "product_images_version_positive" CHECK ("version" > 0),
  CONSTRAINT "product_images_width_positive" CHECK ("width" > 0),
  CONSTRAINT "product_images_height_positive" CHECK ("height" > 0)
);--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_organization_product_fk" FOREIGN KEY ("organization_id","product_id") REFERENCES "public"."products"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_organization_id_unique_idx" ON "product_images" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_active_position_unique_idx" ON "product_images" USING btree ("organization_id","product_id","position") WHERE removed_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_version_unique_idx" ON "product_images" USING btree ("organization_id","product_id","version");--> statement-breakpoint
CREATE INDEX "product_images_active_list_idx" ON "product_images" USING btree ("organization_id","product_id","position") WHERE removed_at IS NULL;--> statement-breakpoint
INSERT INTO "product_images" ("organization_id", "product_id", "position", "version", "blur_data_url", "width", "height", "uploaded_at")
SELECT "organization_id", "id", 0, "image_version", "image_blur_data_url", "image_width", "image_height", coalesce("image_uploaded_at", "created_at")
FROM "products"
WHERE "image_version" is not null
  and "image_blur_data_url" is not null
  and "image_width" is not null
  and "image_height" is not null;--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_images" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "product_images_tenant_isolation" ON "product_images" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "product_images_internal_image_reconcile_select" ON "product_images" AS PERMISSIVE FOR SELECT
USING (current_setting('app.internal_job', true) = 'product_image_reconcile');
