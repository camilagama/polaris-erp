ALTER TABLE "products" ADD COLUMN "image_version" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_width" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_height" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_blur_data_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_version_positive" CHECK ("products"."image_version" is null or "products"."image_version" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_width_positive" CHECK ("products"."image_width" is null or "products"."image_width" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_height_positive" CHECK ("products"."image_height" is null or "products"."image_height" > 0);