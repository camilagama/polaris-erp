ALTER TABLE "billing_customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_customers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "billing_customers_tenant_or_platform_access" ON "billing_customers";--> statement-breakpoint
CREATE POLICY "billing_customers_tenant_or_platform_access" ON "billing_customers" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint

ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "billing_subscriptions_tenant_or_platform_access" ON "billing_subscriptions";--> statement-breakpoint
CREATE POLICY "billing_subscriptions_tenant_or_platform_access" ON "billing_subscriptions" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint

ALTER TABLE "billing_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "billing_invoices_tenant_or_platform_access" ON "billing_invoices";--> statement-breakpoint
CREATE POLICY "billing_invoices_tenant_or_platform_access" ON "billing_invoices" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint

ALTER TABLE "billing_payment_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "billing_payment_attempts_tenant_or_platform_access" ON "billing_payment_attempts";--> statement-breakpoint
CREATE POLICY "billing_payment_attempts_tenant_or_platform_access" ON "billing_payment_attempts" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint

ALTER TABLE "billing_provider_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_provider_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "billing_provider_links_tenant_or_platform_access" ON "billing_provider_links";--> statement-breakpoint
CREATE POLICY "billing_provider_links_tenant_or_platform_access" ON "billing_provider_links" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint

DROP POLICY IF EXISTS "organization_platform_admin_billing_select" ON "organization";--> statement-breakpoint
CREATE POLICY "organization_platform_admin_billing_select" ON "organization" AS PERMISSIVE FOR SELECT
USING (nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL);
