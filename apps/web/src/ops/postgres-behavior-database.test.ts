import { describe, expect, it } from "vitest";
import { validatePostgresBehaviorDatabaseEnv } from "../../../../scripts/require-postgres-behavior-database";

describe("PostgreSQL behavior database guard", () => {
  it("accepts a loopback disposable database and omits credentials from output", () => {
    const target = validatePostgresBehaviorDatabaseEnv({
      POSTGRES_BEHAVIOR_DATABASE_URL:
        "postgres://test-user:test-password@localhost:5432/polaris_test?sslmode=disable",
    });

    expect(target).toBe("postgres://127.0.0.1:5432/polaris_test");
    expect(target).not.toContain("test-user");
    expect(target).not.toContain("test-password");
  });

  it("rejects remote PostgreSQL hosts", () => {
    expect(() =>
      validatePostgresBehaviorDatabaseEnv({
        POSTGRES_BEHAVIOR_DATABASE_URL:
          "postgres://test:secret@db.example.com/polaris_test",
      })
    ).toThrow("must use localhost, 127.0.0.1, or ::1");
  });

  it("rejects the runtime database despite different credentials and query options", () => {
    expect(() =>
      validatePostgresBehaviorDatabaseEnv({
        DATABASE_URL:
          "postgres://runtime:secret@localhost/polaris?sslmode=require",
        POSTGRES_BEHAVIOR_DATABASE_URL:
          "postgresql://test:other@127.0.0.1:5432/polaris?sslmode=disable",
      })
    ).toThrow("must be separate from DATABASE_URL");
  });
});
