import { describe, expect, it } from "vitest";
import { readProductionPreflightEnv } from "@/ops/production-preflight-env";

describe("readProductionPreflightEnv", () => {
  it("forwards support email and database pool max to production preflight", () => {
    const result = readProductionPreflightEnv({
      DATABASE_POOL_MAX: "3",
      NODE_ENV: "test",
      SUPPORT_EMAIL: "support@example.com",
    });

    expect(result).toMatchObject({
      DATABASE_POOL_MAX: "3",
      SUPPORT_EMAIL: "support@example.com",
    });
  });

  it("does not invent values that are absent from the process environment", () => {
    const result = readProductionPreflightEnv({ NODE_ENV: "test" });

    expect(result.SUPPORT_EMAIL).toBeUndefined();
    expect(result.DATABASE_POOL_MAX).toBeUndefined();
  });
});
