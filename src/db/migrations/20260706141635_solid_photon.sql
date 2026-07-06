DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "audit_events" AS ae
		WHERE ae."actor_user_id" IS NOT NULL
			AND NOT EXISTS (
				SELECT 1
				FROM "member" AS m
				WHERE m."organization_id" = ae."organization_id"
					AND m."user_id" = ae."actor_user_id"
			)
	) OR EXISTS (
		SELECT 1
		FROM "goals" AS g
		WHERE NOT EXISTS (
			SELECT 1
			FROM "member" AS m
			WHERE m."organization_id" = g."organization_id"
				AND m."user_id" = g."created_by_user_id"
		)
	) OR EXISTS (
		SELECT 1
		FROM "product_price_changes" AS ppc
		WHERE NOT EXISTS (
			SELECT 1
			FROM "member" AS m
			WHERE m."organization_id" = ppc."organization_id"
				AND m."user_id" = ppc."changed_by_user_id"
		)
	) THEN
		RAISE EXCEPTION 'Tenant-scoped actor references must be resolved before adding organization/member foreign keys';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_actor_member_fk" FOREIGN KEY ("organization_id","actor_user_id") REFERENCES "public"."member"("organization_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_actor_member_fk" FOREIGN KEY ("organization_id","created_by_user_id") REFERENCES "public"."member"("organization_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_changes" ADD CONSTRAINT "product_price_changes_organization_actor_member_fk" FOREIGN KEY ("organization_id","changed_by_user_id") REFERENCES "public"."member"("organization_id","user_id") ON DELETE no action ON UPDATE no action;
