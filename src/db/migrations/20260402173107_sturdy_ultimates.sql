CREATE TABLE "product_price_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"previous_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"next_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_price_changes_previous_price_non_negative" CHECK ("product_price_changes"."previous_price" >= 0),
	CONSTRAINT "product_price_changes_next_price_non_negative" CHECK ("product_price_changes"."next_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_price_changes_product_created_at_idx" ON "product_price_changes" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_price_changes_changed_by_user_id_idx" ON "product_price_changes" USING btree ("changed_by_user_id");