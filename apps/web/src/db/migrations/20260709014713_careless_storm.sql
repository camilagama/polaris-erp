CREATE TYPE "public"."platform_admin_role" AS ENUM('owner', 'operator', 'support');--> statement-breakpoint
CREATE TABLE "platform_admin_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_admin_id" uuid NOT NULL,
	"role" "platform_admin_role" NOT NULL,
	"granted_by_platform_admin_id" uuid,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_status_known_check" CHECK ("platform_admins"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "platform_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_platform_admin_id" uuid,
	"actor_user_id" text,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_support_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_platform_admin_id" uuid,
	"organization_id" text,
	"customer_user_id" text,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_admin_grants" ADD CONSTRAINT "platform_admin_grants_platform_admin_id_platform_admins_id_fk" FOREIGN KEY ("platform_admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_grants" ADD CONSTRAINT "platform_admin_grants_granted_by_platform_admin_id_platform_admins_id_fk" FOREIGN KEY ("granted_by_platform_admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_actor_platform_admin_id_platform_admins_id_fk" FOREIGN KEY ("actor_platform_admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_notes" ADD CONSTRAINT "platform_support_notes_author_platform_admin_id_platform_admins_id_fk" FOREIGN KEY ("author_platform_admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_notes" ADD CONSTRAINT "platform_support_notes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_notes" ADD CONSTRAINT "platform_support_notes_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_admin_grants_platform_admin_id_idx" ON "platform_admin_grants" USING btree ("platform_admin_id");--> statement-breakpoint
CREATE INDEX "platform_admin_grants_role_idx" ON "platform_admin_grants" USING btree ("role");--> statement-breakpoint
CREATE INDEX "platform_admin_grants_active_idx" ON "platform_admin_grants" USING btree ("platform_admin_id","revoked_at","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admins_user_id_unique_idx" ON "platform_admins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_admins_status_idx" ON "platform_admins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_audit_events_created_at_idx" ON "platform_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_events_actor_platform_admin_id_idx" ON "platform_audit_events" USING btree ("actor_platform_admin_id");--> statement-breakpoint
CREATE INDEX "platform_audit_events_action_idx" ON "platform_audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "platform_support_notes_author_platform_admin_id_idx" ON "platform_support_notes" USING btree ("author_platform_admin_id");--> statement-breakpoint
CREATE INDEX "platform_support_notes_organization_id_idx" ON "platform_support_notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "platform_support_notes_customer_user_id_idx" ON "platform_support_notes" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "platform_support_notes_created_at_idx" ON "platform_support_notes" USING btree ("created_at");