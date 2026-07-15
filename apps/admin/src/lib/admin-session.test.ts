import { describe, expect, it } from "vitest";
import { hasExceededAdminSessionLifetime } from "./admin-session";

describe("hasExceededAdminSessionLifetime", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");

  it("rejects a session created more than thirty days ago", () => {
    expect(
      hasExceededAdminSessionLifetime(new Date("2026-06-15T11:59:59.999Z"), now)
    ).toBe(true);
  });

  it("accepts a session at the thirty day boundary", () => {
    expect(
      hasExceededAdminSessionLifetime(new Date("2026-06-15T12:00:00.000Z"), now)
    ).toBe(false);
  });
});
