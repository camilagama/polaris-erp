CREATE TABLE "billing_provider_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"billing_customer_id" uuid,
	"billing_subscription_id" uuid,
	"billing_invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_provider_links_provider_known_check" CHECK ("billing_provider_links"."provider" in ('woovi', 'asaas', 'manual')),
	CONSTRAINT "billing_provider_links_entity_type_known_check" CHECK ("billing_provider_links"."entity_type" in ('customer', 'subscription', 'invoice', 'payment_attempt'))
);
--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" ADD COLUMN "provider_event_id" text;--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_billing_customer_id_billing_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_billing_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_billing_invoice_id_billing_invoices_id_fk" FOREIGN KEY ("billing_invoice_id") REFERENCES "public"."billing_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_links_provider_entity_external_unique_idx" ON "billing_provider_links" USING btree ("provider","entity_type","external_id");--> statement-breakpoint
CREATE INDEX "billing_provider_links_organization_id_idx" ON "billing_provider_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_provider_links_subscription_id_idx" ON "billing_provider_links" USING btree ("billing_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_provider_links_invoice_id_idx" ON "billing_provider_links" USING btree ("billing_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_payment_attempts_provider_event_unique_idx" ON "billing_payment_attempts" USING btree ("provider","provider_event_id") WHERE provider_event_id IS NOT NULL;