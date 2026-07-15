CREATE TYPE "platform_support_case_kind" AS ENUM ('support', 'data_subject_request');--> statement-breakpoint
CREATE TYPE "platform_support_case_status" AS ENUM ('open', 'in_review', 'closed');--> statement-breakpoint

CREATE TABLE "platform_support_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_by_platform_admin_id" uuid REFERENCES "platform_admins"("id") ON DELETE SET NULL,
  "organization_id" text REFERENCES "organization"("id") ON DELETE SET NULL,
  "customer_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "kind" "platform_support_case_kind" NOT NULL,
  "status" "platform_support_case_status" DEFAULT 'open' NOT NULL,
  "reason" text NOT NULL,
  "requester_verified_at" timestamp with time zone,
  "resolution" text,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "platform_support_cases_created_by_platform_admin_id_idx" ON "platform_support_cases" USING btree ("created_by_platform_admin_id");--> statement-breakpoint
CREATE INDEX "platform_support_cases_organization_id_idx" ON "platform_support_cases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "platform_support_cases_customer_user_id_idx" ON "platform_support_cases" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "platform_support_cases_status_created_at_idx" ON "platform_support_cases" USING btree ("status", "created_at");--> statement-breakpoint

ALTER TABLE "platform_support_cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_support_cases" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "platform_support_cases_platform_admin_access" ON "platform_support_cases" AS PERMISSIVE FOR ALL
USING (public.has_active_platform_admin())
WITH CHECK (public.has_active_platform_admin());
