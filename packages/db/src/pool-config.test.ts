import {
  DEFAULT_DATABASE_POOL_MAX,
  resolveDatabasePoolMax,
} from "@polaris/db/pool-config";
import { describe, expect, it } from "vitest";

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
