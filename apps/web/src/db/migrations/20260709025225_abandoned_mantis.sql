CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_message_id" uuid,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_message_id" text,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"from" text NOT NULL,
	"subject" text NOT NULL,
	"template" text NOT NULL,
	"template_version" text NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_message_id" text,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_messages_status_known_check" CHECK ("email_messages"."status" in ('pending', 'sent', 'failed', 'delivered', 'bounced', 'complained', 'suppressed'))
);
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_email_message_id_email_messages_id_fk" FOREIGN KEY ("email_message_id") REFERENCES "public"."email_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_events_provider_event_unique_idx" ON "email_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "email_events_email_message_id_idx" ON "email_events" USING btree ("email_message_id");--> statement-breakpoint
CREATE INDEX "email_events_type_created_at_idx" ON "email_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_idempotency_key_unique_idx" ON "email_messages" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_provider_message_id_unique_idx" ON "email_messages" USING btree ("provider_message_id") WHERE provider_message_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "email_messages_status_created_at_idx" ON "email_messages" USING btree ("status","created_at");