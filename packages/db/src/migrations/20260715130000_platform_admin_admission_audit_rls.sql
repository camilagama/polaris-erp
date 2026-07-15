DROP POLICY IF EXISTS "platform_audit_events_authorized_insert" ON "platform_audit_events";--> statement-breakpoint
CREATE POLICY "platform_audit_events_authorized_insert" ON "platform_audit_events" FOR INSERT
WITH CHECK (
  public.has_active_platform_admin()
  OR current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'auth_audit'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
  OR "actor_admin_user_id" = nullif(current_setting('app.admin_user_id', true), '')
);--> statement-breakpoint
