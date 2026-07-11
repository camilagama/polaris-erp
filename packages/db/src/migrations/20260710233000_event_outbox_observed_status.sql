alter table "event_outbox" drop constraint if exists "event_outbox_status_known_check";

alter table "event_outbox"
  add constraint "event_outbox_status_known_check"
  check ("status" in ('pending', 'processing', 'processed', 'observed', 'failed', 'dead_letter'));

update "event_outbox"
set "status" = 'observed',
    "processed_at" = coalesce("processed_at", now()),
    "last_error" = 'Capture-only webhook event observed before explicit observed status migration.',
    "updated_at" = now()
where "status" = 'pending'
  and "topic" in ('asaas.webhook', 'resend.webhook', 'woovi.webhook');
