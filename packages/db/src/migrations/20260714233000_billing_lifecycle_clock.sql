ALTER TABLE "billing_subscriptions" ADD COLUMN "grace_period_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD COLUMN "last_provider_event_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "billing_subscriptions_grace_period_ends_at_idx" ON "billing_subscriptions" USING btree ("grace_period_ends_at");
