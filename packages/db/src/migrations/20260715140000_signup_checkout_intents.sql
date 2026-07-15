CREATE TABLE "signup_checkout_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "billing_email" text NOT NULL,
  "plan_id" text NOT NULL,
  "provider" text NOT NULL,
  "external_reference" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider_checkout_id" text,
  "provider_subscription_id" text,
  "checkout_url" text,
  "expires_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "claimed_user_id" text,
  "claimed_organization_id" text,
  "claimed_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "signup_checkout_intents_provider_known_check" CHECK ("provider" in ('asaas')),
  CONSTRAINT "signup_checkout_intents_status_known_check" CHECK ("status" in ('pending', 'ready', 'paid', 'review', 'expired', 'cancelled'))
);--> statement-breakpoint
ALTER TABLE "signup_checkout_intents" ADD CONSTRAINT "signup_checkout_intents_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_checkout_intents" ADD CONSTRAINT "signup_checkout_intents_claimed_user_id_users_id_fk" FOREIGN KEY ("claimed_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_checkout_intents" ADD CONSTRAINT "signup_checkout_intents_claimed_organization_id_organization_id_fk" FOREIGN KEY ("claimed_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "signup_checkout_intents_external_reference_unique_idx" ON "signup_checkout_intents" USING btree ("external_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "signup_checkout_intents_provider_checkout_unique_idx" ON "signup_checkout_intents" USING btree ("provider", "provider_checkout_id") WHERE "provider_checkout_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "signup_checkout_intents_email_status_idx" ON "signup_checkout_intents" USING btree ("billing_email", "status", "paid_at");--> statement-breakpoint
ALTER TABLE "signup_checkout_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "signup_checkout_intents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "signup_checkout_intents_internal_access" ON "signup_checkout_intents" AS PERMISSIVE FOR ALL
USING (current_setting('app.internal_job', true) in ('billing_checkout', 'billing_webhook_reconcile', 'onboarding'))
WITH CHECK (current_setting('app.internal_job', true) in ('billing_checkout', 'billing_webhook_reconcile', 'onboarding'));
