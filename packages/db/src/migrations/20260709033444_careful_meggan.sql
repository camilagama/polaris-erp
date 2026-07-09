ALTER TABLE "billing_provider_links" DROP CONSTRAINT "billing_provider_links_entity_type_known_check";--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD COLUMN "card_brand" text;--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD COLUMN "card_last4" text;--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_card_last4_safe_check" CHECK ("billing_provider_links"."card_last4" is null or length("billing_provider_links"."card_last4") <= 4);--> statement-breakpoint
ALTER TABLE "billing_provider_links" ADD CONSTRAINT "billing_provider_links_entity_type_known_check" CHECK ("billing_provider_links"."entity_type" in ('customer', 'subscription', 'invoice', 'payment_attempt', 'payment_method'));