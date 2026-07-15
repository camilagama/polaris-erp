DROP INDEX IF EXISTS "goals_one_active_per_organization_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "goals_one_active_per_organization_metric_idx" ON "goals" USING btree ("organization_id", "metric") WHERE "goals"."status" = 'active';
