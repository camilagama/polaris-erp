DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "accounts"
		GROUP BY "provider_id", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Legacy duplicate provider accounts must be resolved before enforcing Google sub identity uniqueness';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "member"
		GROUP BY "user_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Legacy tenant memberships violate one-person-one-organization and require a reviewed migration';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "member"
		GROUP BY "organization_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Legacy organizations must have exactly one owner before individual tenant constraints are enabled';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "member"
		WHERE "role" <> 'owner'
	) THEN
		RAISE EXCEPTION 'Legacy tenant roles must be reviewed before owner-only membership is enforced';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "organization" AS o
		LEFT JOIN "member" AS m ON m."organization_id" = o."id"
		GROUP BY o."id"
		HAVING count(m."id") <> 1
	) THEN
		RAISE EXCEPTION 'Legacy organizations must have exactly one owner before individual tenant constraints are enabled';
	END IF;

	IF EXISTS (SELECT 1 FROM "invitation") THEN
		RAISE EXCEPTION 'Legacy invitations must be resolved before invitation-free individual tenant constraints are enabled';
	END IF;
END $$;--> statement-breakpoint

ALTER TABLE "member" DROP CONSTRAINT "member_role_known_check";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'owner';--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique_idx" ON "accounts" USING btree ("provider_id", "account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_user_unique_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_unique_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_role_known_check" CHECK ("member"."role" = 'owner');--> statement-breakpoint

CREATE OR REPLACE FUNCTION "enforce_organization_single_owner"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	target_organization_id text;
BEGIN
	IF TG_TABLE_NAME = 'organization' THEN
		target_organization_id := NEW."id";
	ELSIF TG_OP = 'DELETE' THEN
		target_organization_id := OLD."organization_id";
	ELSE
		target_organization_id := NEW."organization_id";
	END IF;

	IF NOT EXISTS (SELECT 1 FROM "organization" WHERE "id" = target_organization_id) THEN
		RETURN NULL;
	END IF;

	IF (
		SELECT count(*)
		FROM "member"
		WHERE "organization_id" = target_organization_id
	) <> 1 THEN
		RAISE EXCEPTION 'Individual organizations must have exactly one owner';
	END IF;

	RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER "organization_single_owner_after_organization_change"
AFTER INSERT OR UPDATE ON "organization"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_organization_single_owner"();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER "organization_single_owner_after_member_change"
AFTER INSERT OR UPDATE OR DELETE ON "member"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_organization_single_owner"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "reject_individual_tenant_invitation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Invitations are disabled for individual tenant organizations';
END;
$$;--> statement-breakpoint

CREATE TRIGGER "reject_individual_tenant_invitation_write"
BEFORE INSERT OR UPDATE ON "invitation"
FOR EACH ROW
EXECUTE FUNCTION "reject_individual_tenant_invitation"();
