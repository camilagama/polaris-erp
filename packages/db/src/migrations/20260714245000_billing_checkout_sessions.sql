CREATE TABLE "billing_checkout_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "billing_subscription_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "external_reference" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider_checkout_id" text,
  "checkout_url" text,
  "expires_at" timestamp with time zone,
  "provider_request_started_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "billing_checkout_sessions_provider_known_check" CHECK ("provider" in ('asaas')),
  CONSTRAINT "billing_checkout_sessions_status_known_check" CHECK ("status" in ('pending', 'ready', 'review', 'expired'))
);--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_billing_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_sessions_external_reference_unique_idx" ON "billing_checkout_sessions" USING btree ("external_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_sessions_organization_idempotency_unique_idx" ON "billing_checkout_sessions" USING btree ("organization_id", "idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_sessions_provider_checkout_unique_idx" ON "billing_checkout_sessions" USING btree ("provider", "provider_checkout_id") WHERE "provider_checkout_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_sessions_one_open_per_organization_idx" ON "billing_checkout_sessions" USING btree ("organization_id") WHERE "status" in ('pending', 'ready', 'review');--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_subscription_id_idx" ON "billing_checkout_sessions" USING btree ("billing_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_status_idx" ON "billing_checkout_sessions" USING btree ("status");--> statement-breakpoint
ALTER TABLE "billing_provider_links" DROP CONSTRAINT "billing_provider_links_entity_type_known_check";--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_entity_type_known_check" CHECK ("entity_type" in ('customer', 'subscription', 'invoice', 'payment_attempt', 'payment_method', 'checkout'));--> statement-breakpoint
DROP POLICY IF EXISTS "billing_provider_links_tenant_or_internal_access" ON "billing_provider_links";--> statement-breakpoint
CREATE POLICY "billing_provider_links_tenant_or_internal_access" ON "billing_provider_links" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) in ('billing_checkout', 'billing_webhook_reconcile')
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) in ('billing_checkout', 'billing_webhook_reconcile')
);--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "billing_checkout_sessions_tenant_or_internal_access" ON "billing_checkout_sessions" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) in ('billing_checkout', 'billing_webhook_reconcile')
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) in ('billing_checkout', 'billing_webhook_reconcile')
);--> statement-breakpoint
CREATE POLICY "billing_checkout_sessions_platform_admin_select" ON "billing_checkout_sessions" FOR SELECT
USING (public.has_active_platform_admin());
