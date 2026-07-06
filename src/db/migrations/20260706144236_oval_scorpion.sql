DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "sales"
		WHERE "payment_method" = 'card'
			AND "payment_fee_payer" = 'not_applicable'
	) THEN
		RAISE EXCEPTION 'Card sales with not_applicable fee payer must be resolved before adding sales card fee payer constraint';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_card_fee_payer_required" CHECK ("sales"."payment_method" <> 'card' or "sales"."payment_fee_payer" in ('seller', 'customer'));
