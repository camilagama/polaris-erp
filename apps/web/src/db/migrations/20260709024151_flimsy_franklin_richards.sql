CREATE TABLE "event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"event_type" text NOT NULL,
	"correlation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_outbox_status_known_check" CHECK ("event_outbox"."status" in ('pending', 'processing', 'processed', 'failed', 'dead_letter')),
	CONSTRAINT "event_outbox_attempts_non_negative" CHECK ("event_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"correlation_id" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"raw_body_sha256" text NOT NULL,
	"redacted_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_status_known_check" CHECK ("webhook_events"."status" in ('received', 'processing', 'processed', 'failed', 'duplicate'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "event_outbox_idempotency_key_unique_idx" ON "event_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "event_outbox_status_available_at_idx" ON "event_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "event_outbox_correlation_id_idx" ON "event_outbox" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_idempotency_key_unique_idx" ON "webhook_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_unique_idx" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_status_created_at_idx" ON "webhook_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_correlation_id_idx" ON "webhook_events" USING btree ("correlation_id");