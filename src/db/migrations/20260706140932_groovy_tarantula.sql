DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "sessions"
		GROUP BY "id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Duplicate sessions.id values must be resolved before creating sessions_id_unique_idx';
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_id_unique_idx" ON "sessions" USING btree ("id");
