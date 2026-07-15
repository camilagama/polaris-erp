ALTER TABLE "email_messages" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "provider_occurred_at" timestamp with time zone;--> statement-breakpoint
UPDATE "email_messages"
SET "status" = CASE
      WHEN "status" = 'sent' THEN 'accepted'
      WHEN "status" = 'complained' THEN 'suppressed'
      ELSE "status"
    END,
    "accepted_at" = CASE
      WHEN "status" = 'sent' THEN coalesce("accepted_at", "sent_at")
      ELSE "accepted_at"
    END;--> statement-breakpoint
ALTER TABLE "email_messages" DROP CONSTRAINT "email_messages_status_known_check";--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_status_known_check" CHECK ("email_messages"."status" in ('pending', 'accepted', 'failed', 'delivered', 'bounced', 'suppressed'));--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_attempt_count_non_negative" CHECK ("email_messages"."attempt_count" >= 0);--> statement-breakpoint
CREATE INDEX "email_messages_retry_idx" ON "email_messages" USING btree ("status", "next_attempt_at");
