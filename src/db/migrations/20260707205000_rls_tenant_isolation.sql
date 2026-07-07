ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "organization_tenant_isolation" ON "organization";--> statement-breakpoint
CREATE POLICY "organization_tenant_isolation" ON "organization" AS PERMISSIVE FOR ALL
USING (
  "id" = nullif(current_setting('app.organization_id', true), '')
  OR EXISTS (
    SELECT 1
    FROM "member"
    WHERE "member"."organization_id" = "organization"."id"
      AND "member"."user_id" = nullif(current_setting('app.user_id', true), '')
  )
)
WITH CHECK ("id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "member_tenant_isolation" ON "member";--> statement-breakpoint
CREATE POLICY "member_tenant_isolation" ON "member" AS PERMISSIVE FOR ALL
USING (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  OR "user_id" = nullif(current_setting('app.user_id', true), '')
)
WITH CHECK (
  "organization_id" = nullif(current_setting('app.organization_id', true), '')
  AND (
    "user_id" = nullif(current_setting('app.user_id', true), '')
    OR nullif(current_setting('app.user_id', true), '') IS NULL
  )
);--> statement-breakpoint

ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitation" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "invitation_tenant_isolation" ON "invitation";--> statement-breakpoint
CREATE POLICY "invitation_tenant_isolation" ON "invitation" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "audit_events_tenant_isolation" ON "audit_events";--> statement-breakpoint
CREATE POLICY "audit_events_tenant_isolation" ON "audit_events" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "categories_tenant_isolation" ON "categories";--> statement-breakpoint
CREATE POLICY "categories_tenant_isolation" ON "categories" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "system_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "system_settings_tenant_isolation" ON "system_settings";--> statement-breakpoint
CREATE POLICY "system_settings_tenant_isolation" ON "system_settings" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "products_tenant_isolation" ON "products";--> statement-breakpoint
DROP POLICY IF EXISTS "products_internal_image_reconcile_select" ON "products";--> statement-breakpoint
CREATE POLICY "products_tenant_isolation" ON "products" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "products_internal_image_reconcile_select" ON "products" AS PERMISSIVE FOR SELECT
USING (current_setting('app.internal_job', true) = 'product_image_reconcile');--> statement-breakpoint

ALTER TABLE "product_price_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_price_changes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "product_price_changes_tenant_isolation" ON "product_price_changes";--> statement-breakpoint
CREATE POLICY "product_price_changes_tenant_isolation" ON "product_price_changes" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "product_stock_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_stock_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "product_stock_entries_tenant_isolation" ON "product_stock_entries";--> statement-breakpoint
CREATE POLICY "product_stock_entries_tenant_isolation" ON "product_stock_entries" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "product_stock_write_offs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_stock_write_offs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "product_stock_write_offs_tenant_isolation" ON "product_stock_write_offs";--> statement-breakpoint
CREATE POLICY "product_stock_write_offs_tenant_isolation" ON "product_stock_write_offs" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "sales_tenant_isolation" ON "sales";--> statement-breakpoint
CREATE POLICY "sales_tenant_isolation" ON "sales" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sale_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "sale_items_tenant_isolation" ON "sale_items";--> statement-breakpoint
CREATE POLICY "sale_items_tenant_isolation" ON "sale_items" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "goals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "goals_tenant_isolation" ON "goals";--> statement-breakpoint
CREATE POLICY "goals_tenant_isolation" ON "goals" AS PERMISSIVE FOR ALL
USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));
