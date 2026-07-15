CREATE TABLE "command_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
	"command_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"correlation_id" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_executions_status_known_check" CHECK ("command_executions"."status" in ('processing', 'succeeded', 'failed'))
);--> statement-breakpoint
CREATE UNIQUE INDEX "command_executions_organization_type_key_unique_idx" ON "command_executions" USING btree ("organization_id", "command_type", "idempotency_key");--> statement-breakpoint
CREATE INDEX "command_executions_organization_status_idx" ON "command_executions" USING btree ("organization_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX "command_executions_correlation_id_idx" ON "command_executions" USING btree ("correlation_id");
