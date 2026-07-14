CREATE OR REPLACE FUNCTION public.has_active_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_admins pa
    INNER JOIN platform_admin_grants pag
      ON pag.platform_admin_id = pa.id
    WHERE pa.id::text = nullif(current_setting('app.platform_admin_id', true), '')
      AND pa.status = 'active'
      AND pag.revoked_at IS NULL
      AND (pag.expires_at IS NULL OR pag.expires_at > now())
  );
$$;--> statement-breakpoint

DROP POLICY IF EXISTS "organization_platform_admin_billing_select" ON "organization";--> statement-breakpoint
DROP POLICY IF EXISTS "organization_platform_admin_select" ON "organization";--> statement-breakpoint
DROP POLICY IF EXISTS "organization_platform_admin_update" ON "organization";--> statement-breakpoint
CREATE POLICY "organization_platform_admin_select" ON "organization" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
CREATE POLICY "organization_platform_admin_update" ON "organization" FOR UPDATE
USING (public.has_active_platform_admin())
WITH CHECK (public.has_active_platform_admin());--> statement-breakpoint

DROP POLICY IF EXISTS "member_platform_admin_select" ON "member";--> statement-breakpoint
CREATE POLICY "member_platform_admin_select" ON "member" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "invitation_platform_admin_select" ON "invitation";--> statement-breakpoint
CREATE POLICY "invitation_platform_admin_select" ON "invitation" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "audit_events_platform_admin_select" ON "audit_events";--> statement-breakpoint
CREATE POLICY "audit_events_platform_admin_select" ON "audit_events" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "categories_platform_admin_select" ON "categories";--> statement-breakpoint
CREATE POLICY "categories_platform_admin_select" ON "categories" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "system_settings_platform_admin_select" ON "system_settings";--> statement-breakpoint
CREATE POLICY "system_settings_platform_admin_select" ON "system_settings" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "products_platform_admin_select" ON "products";--> statement-breakpoint
CREATE POLICY "products_platform_admin_select" ON "products" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "product_price_changes_platform_admin_select" ON "product_price_changes";--> statement-breakpoint
CREATE POLICY "product_price_changes_platform_admin_select" ON "product_price_changes" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "product_stock_entries_platform_admin_select" ON "product_stock_entries";--> statement-breakpoint
CREATE POLICY "product_stock_entries_platform_admin_select" ON "product_stock_entries" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "product_stock_write_offs_platform_admin_select" ON "product_stock_write_offs";--> statement-breakpoint
CREATE POLICY "product_stock_write_offs_platform_admin_select" ON "product_stock_write_offs" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "sales_platform_admin_select" ON "sales";--> statement-breakpoint
CREATE POLICY "sales_platform_admin_select" ON "sales" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "sale_items_platform_admin_select" ON "sale_items";--> statement-breakpoint
CREATE POLICY "sale_items_platform_admin_select" ON "sale_items" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
DROP POLICY IF EXISTS "goals_platform_admin_select" ON "goals";--> statement-breakpoint
CREATE POLICY "goals_platform_admin_select" ON "goals" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint

DROP POLICY IF EXISTS "billing_customers_tenant_or_platform_access" ON "billing_customers";--> statement-breakpoint
CREATE POLICY "billing_customers_tenant_or_internal_access" ON "billing_customers" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint
CREATE POLICY "billing_customers_platform_admin_select" ON "billing_customers" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint

DROP POLICY IF EXISTS "billing_subscriptions_tenant_or_platform_access" ON "billing_subscriptions";--> statement-breakpoint
CREATE POLICY "billing_subscriptions_tenant_or_internal_access" ON "billing_subscriptions" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint
CREATE POLICY "billing_subscriptions_platform_admin_select" ON "billing_subscriptions" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_subscriptions_platform_admin_update" ON "billing_subscriptions" FOR UPDATE
USING (public.has_active_platform_admin())
WITH CHECK (public.has_active_platform_admin());--> statement-breakpoint

DROP POLICY IF EXISTS "billing_invoices_tenant_or_platform_access" ON "billing_invoices";--> statement-breakpoint
CREATE POLICY "billing_invoices_tenant_or_internal_access" ON "billing_invoices" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint
CREATE POLICY "billing_invoices_platform_admin_select" ON "billing_invoices" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint

DROP POLICY IF EXISTS "billing_payment_attempts_tenant_or_platform_access" ON "billing_payment_attempts";--> statement-breakpoint
CREATE POLICY "billing_payment_attempts_tenant_or_internal_access" ON "billing_payment_attempts" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint
CREATE POLICY "billing_payment_attempts_platform_admin_select" ON "billing_payment_attempts" FOR SELECT
USING (public.has_active_platform_admin());--> statement-breakpoint

DROP POLICY IF EXISTS "billing_provider_links_tenant_or_platform_access" ON "billing_provider_links";--> statement-breakpoint
CREATE POLICY "billing_provider_links_tenant_or_internal_access" ON "billing_provider_links" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR current_setting('app.internal_job', true) = 'billing_webhook_reconcile'
);--> statement-breakpoint
CREATE POLICY "billing_provider_links_platform_admin_select" ON "billing_provider_links" FOR SELECT
USING (public.has_active_platform_admin());
