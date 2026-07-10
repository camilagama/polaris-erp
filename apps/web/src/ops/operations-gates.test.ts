import { describe, expect, it } from "vitest";
import { validateRestoreDrillEnv } from "../../../../scripts/check-restore-drill";
import { validateMigrationDatabaseEnv } from "../../../../scripts/require-database-url-direct";

describe("migration operation gates", () => {
  it("requires DATABASE_URL_DIRECT for migrations", () => {
    expect(() => validateMigrationDatabaseEnv({})).toThrow(
      "DATABASE_URL_DIRECT is required"
    );
  });

  it("rejects reusing the runtime database URL for migrations", () => {
    expect(() =>
      validateMigrationDatabaseEnv({
        DATABASE_URL: "postgres://runtime.example.com/app",
        DATABASE_URL_DIRECT: "postgres://runtime.example.com/app",
      })
    ).toThrow("must be separate from DATABASE_URL");
  });

  it("returns a redacted migration target for valid direct URLs", () => {
    expect(
      validateMigrationDatabaseEnv({
        DATABASE_URL: "postgres://runtime.example.com/app",
        DATABASE_URL_DIRECT:
          "postgres://owner:secret@direct.example.com:5432/app",
      })
    ).toBe("postgres://direct.example.com:5432/app");
  });
});

describe("restore drill checklist", () => {
  it("requires explicit restore drill evidence", () => {
    expect(() => validateRestoreDrillEnv({})).toThrow(
      "Restore drill evidence is incomplete"
    );
  });

  it("requires a restored branch distinct from the source branch", () => {
    expect(() =>
      validateRestoreDrillEnv({
        RESTORE_DRILL_CONFIRMED_AT: "2026-07-10T12:00:00.000Z",
        RESTORE_DRILL_RESTORE_BRANCH: "production",
        RESTORE_DRILL_SOURCE_BRANCH: "production",
        RESTORE_DRILL_VALIDATED_BY: "ops@example.com",
      })
    ).toThrow("must be a restored validation branch");
  });

  it("accepts complete restore drill evidence", () => {
    expect(() =>
      validateRestoreDrillEnv({
        RESTORE_DRILL_CONFIRMED_AT: "2026-07-10T12:00:00.000Z",
        RESTORE_DRILL_RESTORE_BRANCH: "production-restore-drill-20260710",
        RESTORE_DRILL_SOURCE_BRANCH: "production",
        RESTORE_DRILL_VALIDATED_BY: "ops@example.com",
      })
    ).not.toThrow();
  });
});
