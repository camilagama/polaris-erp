ALTER TABLE "command_executions"
  RENAME CONSTRAINT "command_executions_organization_id_fkey"
  TO "command_executions_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "platform_admins"
  RENAME CONSTRAINT "platform_admins_admin_user_id_fkey"
  TO "platform_admins_admin_user_id_admin_users_id_fk";
--> statement-breakpoint
ALTER TABLE "platform_audit_events"
  RENAME CONSTRAINT "platform_audit_events_actor_admin_user_id_fkey"
  TO "platform_audit_events_actor_admin_user_id_admin_users_id_fk";
--> statement-breakpoint
ALTER TABLE "platform_support_cases"
  RENAME CONSTRAINT "platform_support_cases_created_by_platform_admin_id_fkey"
  TO "platform_support_cases_created_by_platform_admin_id_platform_admins_id_fk";
--> statement-breakpoint
ALTER TABLE "platform_support_cases"
  RENAME CONSTRAINT "platform_support_cases_organization_id_fkey"
  TO "platform_support_cases_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "platform_support_cases"
  RENAME CONSTRAINT "platform_support_cases_customer_user_id_fkey"
  TO "platform_support_cases_customer_user_id_users_id_fk";
--> statement-breakpoint
CREATE INDEX "event_outbox_created_at_idx"
  ON "event_outbox" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "webhook_events_created_at_idx"
  ON "webhook_events" USING btree ("created_at");
