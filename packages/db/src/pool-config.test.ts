import {
  DEFAULT_DATABASE_POOL_MAX,
  resolveDatabasePoolMax,
  resolveDatabaseSsl,
  stripDatabaseSslConnectionParameters,
} from "@polaris/db/pool-config";
import { describe, expect, it } from "vitest";

describe("resolveDatabaseSsl", () => {
  it("disables TLS only for loopback hosts outside production", () => {
    for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(
        resolveDatabaseSsl(`postgres://user:pass@${hostname}:5432/app`, "test")
      ).toBe(false);
    }
  });

  it("requires TLS for remote hosts and every production connection", () => {
    expect(
      resolveDatabaseSsl("postgres://user:pass@db.example.com:5432/app", "test")
    ).toBe(true);
    expect(
      resolveDatabaseSsl(
        "postgres://user:pass@127.0.0.1:5432/app",
        "production"
      )
    ).toBe(true);
  });

  it("fails closed for invalid connection strings", () => {
    expect(resolveDatabaseSsl("invalid database URL", "test")).toBe(true);
  });

  it("removes URL TLS overrides before applying the host-based pool policy", () => {
    const connectionString = stripDatabaseSslConnectionParameters(
      "postgres://user:pass@db.example.com:5432/app?sslmode=disable&ssl=no-verify&sslrootcert=%2Ftmp%2Fca.pem&channel_binding=require"
    );
    const url = new URL(connectionString);

    expect(url.searchParams.has("sslmode")).toBe(false);
    expect(url.searchParams.has("ssl")).toBe(false);
    expect(url.searchParams.has("sslrootcert")).toBe(false);
    expect(url.searchParams.get("channel_binding")).toBe("require");
  });
});

describe("resolveDatabasePoolMax", () => {
  it("uses a conservative serverless default", () => {
    expect(resolveDatabasePoolMax(undefined)).toBe(DEFAULT_DATABASE_POOL_MAX);
    expect(resolveDatabasePoolMax("")).toBe(DEFAULT_DATABASE_POOL_MAX);
  });

  it("accepts explicit integer pool limits", () => {
    expect(resolveDatabasePoolMax("1")).toBe(1);
    expect(resolveDatabasePoolMax("5")).toBe(5);
  });

  it("rejects unsafe or invalid pool limits", () => {
    for (const value of ["0", "21", "3.5", "many"]) {
      expect(() => resolveDatabasePoolMax(value)).toThrow(
        "DATABASE_POOL_MAX must be an integer between 1 and 20."
      );
    }
  });
});
