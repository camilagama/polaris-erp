CREATE TABLE "billing_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"billing_email" text,
	"tax_id_last4" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"billing_subscription_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_status_known_check" CHECK ("billing_invoices"."status" in ('draft', 'open', 'paid', 'void', 'uncollectible')),
	CONSTRAINT "billing_invoices_amounts_non_negative" CHECK ("billing_invoices"."subtotal_cents" >= 0 and "billing_invoices"."discount_cents" >= 0 and "billing_invoices"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"billing_invoice_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_payment_attempts_provider_known_check" CHECK ("billing_payment_attempts"."provider" in ('woovi', 'asaas', 'manual')),
	CONSTRAINT "billing_payment_attempts_status_known_check" CHECK ("billing_payment_attempts"."status" in ('pending', 'processing', 'succeeded', 'failed')),
	CONSTRAINT "billing_payment_attempts_amount_cents_non_negative" CHECK ("billing_payment_attempts"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"interval" text NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"amount_cents" integer NOT NULL,
	"entitlements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plans_status_known_check" CHECK ("billing_plans"."status" in ('active', 'archived')),
	CONSTRAINT "billing_plans_interval_known_check" CHECK ("billing_plans"."interval" in ('month', 'year')),
	CONSTRAINT "billing_plans_amount_cents_non_negative" CHECK ("billing_plans"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"billing_customer_id" uuid,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscriptions_status_known_check" CHECK ("billing_subscriptions"."status" in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete'))
);
--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_billing_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_billing_invoice_id_billing_invoices_id_fk" FOREIGN KEY ("billing_invoice_id") REFERENCES "public"."billing_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_customer_id_billing_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_organization_unique_idx" ON "billing_customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_invoices_organization_created_at_idx" ON "billing_invoices" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_payment_attempts_invoice_id_idx" ON "billing_payment_attempts" USING btree ("billing_invoice_id");--> statement-breakpoint
CREATE INDEX "billing_payment_attempts_status_idx" ON "billing_payment_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_plans_status_idx" ON "billing_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_organization_id_idx" ON "billing_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_active_organization_unique_idx" ON "billing_subscriptions" USING btree ("organization_id") WHERE status in ('trialing', 'active', 'past_due', 'paused');