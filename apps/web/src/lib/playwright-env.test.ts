import { describe, expect, it } from "vitest";
import { assertE2eDatabaseSchema } from "@/lib/e2e-database-schema";
import { validateE2eDatabaseEnv } from "@/lib/playwright-env";
import {
  E2E_DEFAULT_CRON_SECRET,
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
} from "../../tests/e2e/constants";

const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

describe("validateE2eDatabaseEnv", () => {
  it("rejects CI runs without an isolated E2E database", () => {
    expect(() =>
      validateE2eDatabaseEnv({
        CI: "true",
        E2E_DATABASE_URL: undefined,
      })
    ).toThrow("CI exige E2E_DATABASE_URL");
  });

  it("accepts CI runs with an isolated E2E database", () => {
    expect(() =>
      validateE2eDatabaseEnv({
        CI: "true",
        E2E_DATABASE_URL: "postgres://e2e:e2e@example.com/e2e",
      })
    ).not.toThrow();
  });

  it("allows explicit local shared database opt-in outside CI", () => {
    expect(() =>
      validateE2eDatabaseEnv({
        ALLOW_E2E_SHARED_DATABASE: "true",
        CI: undefined,
        E2E_DATABASE_URL: undefined,
      })
    ).not.toThrow();
  });

  it("uses E2E default secrets that satisfy production build validation", () => {
    expect(E2E_DEFAULT_CRON_SECRET.length).toBeGreaterThanOrEqual(
      MINIMUM_PRODUCTION_SECRET_LENGTH
    );
    expect(E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET.length).toBeGreaterThanOrEqual(
      MINIMUM_PRODUCTION_SECRET_LENGTH
    );
  });

  it("reports missing E2E schema objects before Playwright starts", () => {
    expect(() =>
      assertE2eDatabaseSchema({
        platformAdminGrants: false,
        platformAdmins: false,
        salesIdempotencyKey: false,
        salesOrganizationIdempotencyKeyUniqueIdx: false,
        sessionsIdUniqueIdx: true,
      })
    ).toThrow(
      "E2E database schema is outdated: platform_admin_grants, platform_admins, sales.idempotency_key, sales_organization_idempotency_key_unique_idx"
    );
  });
});
