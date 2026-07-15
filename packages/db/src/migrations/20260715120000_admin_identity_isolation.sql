DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "platform_admins") THEN
    RAISE EXCEPTION 'platform_admins must be empty before admin identity isolation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "platform_audit_events"
    WHERE "actor_user_id" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'platform audit events with tenant actors require explicit migration';
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE "admin_users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);--> statement-breakpoint

CREATE TABLE "admin_sessions" (
  "id" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_sessions_token_unique" UNIQUE("token"),
  CONSTRAINT "admin_sessions_user_id_admin_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE cascade
);--> statement-breakpoint

CREATE TABLE "admin_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_accounts_provider_account_unique"
    UNIQUE("provider_id", "account_id"),
  CONSTRAINT "admin_accounts_user_id_admin_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE cascade
);--> statement-breakpoint

CREATE TABLE "admin_verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "platform_admin_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "role" "platform_admin_role" NOT NULL,
  "reason" text NOT NULL,
  "grant_expires_at" timestamp with time zone NOT NULL,
  "enrollment_expires_at" timestamp with time zone NOT NULL,
  "claimed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_admin_enrollments_email_unique" UNIQUE("email")
);--> statement-breakpoint

CREATE UNIQUE INDEX "admin_sessions_id_unique_idx" ON "admin_sessions" USING btree ("id");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_accounts_user_id_idx" ON "admin_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_admin_enrollments_claimed_at_idx" ON "platform_admin_enrollments" USING btree ("claimed_at");--> statement-breakpoint

ALTER TABLE "platform_admin_enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_admin_enrollments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "platform_admin_enrollments_internal_access" ON "platform_admin_enrollments" AS PERMISSIVE FOR ALL
USING (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
)
WITH CHECK (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
);--> statement-breakpoint

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

DROP POLICY IF EXISTS "platform_admins_current_user_or_bootstrap_access" ON "platform_admins";--> statement-breakpoint
DROP POLICY IF EXISTS "platform_admin_grants_current_user_or_bootstrap_access" ON "platform_admin_grants";--> statement-breakpoint

ALTER TABLE "platform_admins"
  DROP CONSTRAINT IF EXISTS "platform_admins_user_id_users_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "platform_admins_user_id_unique_idx";--> statement-breakpoint
ALTER TABLE "platform_admins" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "platform_admins"
  ADD COLUMN "admin_user_id" text NOT NULL
  REFERENCES "admin_users"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admins_admin_user_id_unique_idx"
  ON "platform_admins" USING btree ("admin_user_id");--> statement-breakpoint

DROP POLICY IF EXISTS "platform_audit_events_authorized_insert" ON "platform_audit_events";--> statement-breakpoint
ALTER TABLE "platform_audit_events"
  DROP CONSTRAINT IF EXISTS "platform_audit_events_actor_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "platform_audit_events" DROP COLUMN "actor_user_id";--> statement-breakpoint
ALTER TABLE "platform_audit_events"
  ADD COLUMN "actor_admin_user_id" text
  REFERENCES "admin_users"("id") ON DELETE set null;--> statement-breakpoint

DROP POLICY IF EXISTS "platform_admins_current_user_or_bootstrap_access" ON "platform_admins";--> statement-breakpoint
CREATE POLICY "platform_admins_current_admin_or_internal_access" ON "platform_admins" AS PERMISSIVE FOR ALL
USING (
  "admin_user_id" = nullif(current_setting('app.admin_user_id', true), '')
  OR "id"::text = nullif(current_setting('app.platform_admin_id', true), '')
  OR current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
)
WITH CHECK (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
);--> statement-breakpoint

DROP POLICY IF EXISTS "platform_admin_grants_current_user_or_bootstrap_access" ON "platform_admin_grants";--> statement-breakpoint
CREATE POLICY "platform_admin_grants_current_admin_or_internal_access" ON "platform_admin_grants" AS PERMISSIVE FOR ALL
USING (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
  OR "platform_admin_id"::text = nullif(current_setting('app.platform_admin_id', true), '')
  OR EXISTS (
    SELECT 1
    FROM "platform_admins"
    WHERE "platform_admins"."id" = "platform_admin_grants"."platform_admin_id"
      AND "platform_admins"."admin_user_id" = nullif(current_setting('app.admin_user_id', true), '')
  )
)
WITH CHECK (
  current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
  OR current_setting('app.internal_job', true) = 'platform_admin_admission'
);--> statement-breakpoint

DROP POLICY IF EXISTS "platform_audit_events_authorized_insert" ON "platform_audit_events";--> statement-breakpoint
CREATE POLICY "platform_audit_events_authorized_insert" ON "platform_audit_events" FOR INSERT
WITH CHECK (
  public.has_active_platform_admin()
  OR current_setting('app.internal_job', true) = 'platform_admin_bootstrap'
  OR current_setting('app.internal_job', true) = 'auth_audit'
  OR current_setting('app.internal_job', true) = 'platform_admin_grant_management'
  OR "actor_admin_user_id" = nullif(current_setting('app.admin_user_id', true), '')
);
