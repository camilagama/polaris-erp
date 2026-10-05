import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getEnrollmentExpiration,
  parseGrantExpiration,
} from "./grant-expiration";

const formWith = (value: string): FormData => {
  const form = new FormData();
  form.set("expiresAt", value);
  return form;
};

describe("grant expiration in São Paulo", () => {
  afterEach(() => vi.useRealTimers());

  it("converts browser wall time to the exact UTC instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T00:00:00Z"));
    expect(
      parseGrantExpiration(formWith("2026-10-03T12:30")).toISOString()
    ).toBe("2026-10-03T15:30:00.000Z");
  });

  it.each([
    "2018-11-04T00:30",
    "2019-02-16T23:30",
    "2026-02-30T12:00",
    "2026-10-03T24:00",
  ])("rejects invalid or ambiguous wall time %s", (value) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2010-01-01T00:00:00Z"));
    expect(() => parseGrantExpiration(formWith(value))).toThrow(
      "inválido, inexistente ou repetido"
    );
  });

  it.each(["2026-10-03T12:30Z", "2026-10-03T12:30:00", "2026-10-03", ""])(
    "rejects non-form input %s",
    (value) => {
      expect(() => parseGrantExpiration(formWith(value))).toThrow(
        "uma única data"
      );
    }
  );

  it("rejects duplicate expiration fields", () => {
    const form = formWith("2099-01-01T12:00");
    form.append("expiresAt", "2099-01-02T12:00");
    expect(() => parseGrantExpiration(form)).toThrow("uma única data");
  });

  it("caps admission at the earlier of 168 elapsed hours and grant expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2018-11-01T12:00:00Z"));
    expect(
      getEnrollmentExpiration(new Date("2018-12-01T12:00:00Z")).toISOString()
    ).toBe("2018-11-08T12:00:00.000Z");
    expect(
      getEnrollmentExpiration(new Date("2018-11-02T12:00:00Z")).toISOString()
    ).toBe("2018-11-02T12:00:00.000Z");
  });
});
