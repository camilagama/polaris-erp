ALTER TABLE "platform_admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_admins" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_admin_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_admin_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_audit_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_support_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_support_notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "platform_admins_current_user_or_bootstrap_access" ON "platform_admins";--> statement-breakpoint
CREATE POLICY "platform_admins_current_user_or_bootstrap_access" ON "platform_admins" AS PERMISSIVE FOR ALL
USING (
  "user_id" = nullif(current_setting('app.user_id', true), '')
  OR "id"::text = nullif(current_setting('app.platform_admin_id', true), '')
  OR current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
)
WITH CHECK (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
);--> statement-breakpoint

DROP POLICY IF EXISTS "platform_admin_grants_current_user_or_bootstrap_access" ON "platform_admin_grants";--> statement-breakpoint
CREATE POLICY "platform_admin_grants_current_user_or_bootstrap_access" ON "platform_admin_grants" AS PERMISSIVE FOR ALL
USING (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
  OR "platform_admin_id"::text = nullif(current_setting('app.platform_admin_id', true), '')
  OR EXISTS (
    SELECT 1
    FROM "platform_admins"
    WHERE "platform_admins"."id" = "platform_admin_grants"."platform_admin_id"
      AND "platform_admins"."user_id" = nullif(current_setting('app.user_id', true), '')
  )
)
WITH CHECK (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
);--> statement-breakpoint

DROP POLICY IF EXISTS "platform_audit_events_platform_or_bootstrap_access" ON "platform_audit_events";--> statement-breakpoint
DROP POLICY IF EXISTS "platform_audit_events_platform_select" ON "platform_audit_events";--> statement-breakpoint
DROP POLICY IF EXISTS "platform_audit_events_authorized_insert" ON "platform_audit_events";--> statement-breakpoint
CREATE POLICY "platform_audit_events_platform_select" ON "platform_audit_events" FOR SELECT
USING (
  public.has_active_platform_admin()
  OR current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
);--> statement-breakpoint
CREATE POLICY "platform_audit_events_authorized_insert" ON "platform_audit_events" FOR INSERT
WITH CHECK (
  public.has_active_platform_admin()
  OR current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'auth_audit'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
  OR "actor_user_id" = nullif(current_setting('app.user_id', true), '')
);--> statement-breakpoint

DROP POLICY IF EXISTS "platform_support_notes_platform_admin_access" ON "platform_support_notes";--> statement-breakpoint
CREATE POLICY "platform_support_notes_platform_admin_access" ON "platform_support_notes" AS PERMISSIVE FOR ALL
USING (public.has_active_platform_admin())
WITH CHECK (public.has_active_platform_admin());
