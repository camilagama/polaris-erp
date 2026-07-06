DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "goals"
		WHERE "status" = 'active'
		GROUP BY "organization_id"
		HAVING COUNT(*) > 1
	) THEN
		RAISE EXCEPTION 'Multiple active goals per organization must be resolved before adding goals active unique index';
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "goals_one_active_per_organization_idx" ON "goals" USING btree ("organization_id") WHERE status = 'active';
