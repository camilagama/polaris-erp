CREATE POLICY "billing_subscriptions_billing_lifecycle_access" ON "billing_subscriptions" AS PERMISSIVE FOR ALL
USING (current_setting('app.internal_job', true) = 'billing_lifecycle')
WITH CHECK (current_setting('app.internal_job', true) = 'billing_lifecycle');--> statement-breakpoint
CREATE POLICY "audit_events_billing_lifecycle_insert" ON "audit_events" AS PERMISSIVE FOR INSERT
WITH CHECK (current_setting('app.internal_job', true) = 'billing_lifecycle');
