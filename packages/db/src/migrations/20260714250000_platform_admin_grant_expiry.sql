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
      AND pag.expires_at > now()
  );
$$;--> statement-breakpoint

ALTER TABLE "platform_admin_grants"
  DROP CONSTRAINT IF EXISTS "platform_admin_grants_expiry_required_check";--> statement-breakpoint
ALTER TABLE "platform_admin_grants"
  ADD CONSTRAINT "platform_admin_grants_expiry_required_check"
  CHECK ("expires_at" IS NOT NULL) NOT VALID;
