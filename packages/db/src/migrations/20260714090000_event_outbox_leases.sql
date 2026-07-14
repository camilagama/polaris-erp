ALTER TABLE "event_outbox"
  ADD COLUMN "claim_token" text,
  ADD COLUMN "claimed_at" timestamp with time zone,
  ADD COLUMN "lease_expires_at" timestamp with time zone;

CREATE INDEX "event_outbox_status_lease_expires_at_idx"
  ON "event_outbox" USING btree ("status", "lease_expires_at");
