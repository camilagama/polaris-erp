DROP POLICY IF EXISTS "organization_stock_ledger_reconciliation_select" ON "organization";--> statement-breakpoint
CREATE POLICY "organization_stock_ledger_reconciliation_select" ON "organization" AS PERMISSIVE FOR SELECT
USING (current_setting('app.internal_job', true) = 'stock_ledger_reconciliation');
