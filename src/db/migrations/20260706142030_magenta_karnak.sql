DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "invitation" AS i
		WHERE NOT EXISTS (
			SELECT 1
			FROM "member" AS m
			WHERE m."organization_id" = i."organization_id"
				AND m."user_id" = i."inviter_id"
		)
	) THEN
		RAISE EXCEPTION 'Tenant-scoped actor references must be resolved before adding invitation organization/member foreign key';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_inviter_member_fk" FOREIGN KEY ("organization_id","inviter_id") REFERENCES "public"."member"("organization_id","user_id") ON DELETE no action ON UPDATE no action;
