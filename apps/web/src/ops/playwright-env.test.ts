import {
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  requireE2eDatabaseUrl,
} from "@polaris/e2e-support";
import { describe, expect, it } from "vitest";
import { assertE2eDatabaseSchema } from "@/ops/e2e-database-schema";

const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

describe("E2E database environment", () => {
  it("rejects runs without an isolated E2E database", () => {
    expect(() =>
      requireE2eDatabaseUrl({ E2E_DATABASE_URL: undefined })
    ).toThrow("E2E_DATABASE_URL");
  });

  it("accepts an isolated E2E database", () => {
    expect(() =>
      requireE2eDatabaseUrl({
        E2E_DATABASE_URL: "postgres://e2e:e2e@example.com/e2e",
      })
    ).not.toThrow();
  });

  it("uses an E2E default bootstrap secret that satisfies production build validation", () => {
    expect(E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET.length).toBeGreaterThanOrEqual(
      MINIMUM_PRODUCTION_SECRET_LENGTH
    );
  });

  it("reports missing E2E schema objects before Playwright starts", () => {
    expect(() =>
      assertE2eDatabaseSchema({
        platformAuditAdminUserId: false,
        platformAdminGrants: false,
        platformAdmins: false,
        salesIdempotencyKey: false,
        salesOrganizationIdempotencyKeyUniqueIdx: false,
        sessionsIdUniqueIdx: true,
      })
    ).toThrow(
      "E2E database schema is outdated: platform_audit_events.actor_admin_user_id, platform_admin_grants, platform_admins, sales.idempotency_key, sales_organization_idempotency_key_unique_idx"
    );
  });
});
