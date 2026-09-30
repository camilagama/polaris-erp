import { describe, expect, it } from "vitest";
import {
  assertBaselineReviewCurrent,
  compareAuditToBaseline,
  flattenAuditAdvisories,
  parseAuditJsonFromOutput,
} from "../../../../scripts/check-bun-audit-baseline";

describe("dependency advisory baseline guard", () => {
  it("does not require a review deadline when no advisories are accepted", () => {
    expect(() =>
      assertBaselineReviewCurrent(
        {
          acceptedAdvisories: [],
          generatedAt: "2026-09-27",
          owner: "Platform engineering",
        },
        new Date("2026-09-27T12:00:00.000Z")
      )
    ).not.toThrow();
  });

  it("parses bun audit JSON even when Bun prefixes timing output", () => {
    const auditJson = parseAuditJsonFromOutput(
      '$ bun audit --json\n{"vite":[{"severity":"high","title":"dev server issue","url":"https://github.com/advisories/GHSA-test"}]}'
    );

    expect(auditJson.vite?.[0]?.url).toBe(
      "https://github.com/advisories/GHSA-test"
    );
  });

  it("flattens advisories into deterministic package/url records", () => {
    const advisories = flattenAuditAdvisories({
      defu: [
        {
          severity: "high",
          title: "prototype pollution",
          url: "https://github.com/advisories/GHSA-defu",
        },
      ],
      vite: [
        {
          severity: "moderate",
          title: "dev server exposure",
          url: "https://github.com/advisories/GHSA-vite",
        },
      ],
    });

    expect(advisories).toEqual([
      {
        packageName: "defu",
        severity: "high",
        url: "https://github.com/advisories/GHSA-defu",
      },
      {
        packageName: "vite",
        severity: "moderate",
        url: "https://github.com/advisories/GHSA-vite",
      },
    ]);
  });

  it("fails only advisories outside the accepted baseline", () => {
    const comparison = compareAuditToBaseline(
      [
        {
          packageName: "defu",
          severity: "high",
          url: "https://github.com/advisories/GHSA-accepted",
        },
        {
          packageName: "fast-uri",
          severity: "high",
          url: "https://github.com/advisories/GHSA-new",
        },
      ],
      {
        acceptedAdvisories: [
          {
            packageName: "defu",
            severity: "high",
            url: "https://github.com/advisories/GHSA-accepted",
          },
          {
            packageName: "vite",
            severity: "moderate",
            url: "https://github.com/advisories/GHSA-resolved",
          },
        ],
        generatedAt: "2026-07-10",
        owner: "Platform engineering",
        reviewBy: "2026-08-10",
      }
    );

    expect(comparison.newAdvisories).toEqual([
      {
        packageName: "fast-uri",
        severity: "high",
        url: "https://github.com/advisories/GHSA-new",
      },
    ]);
    expect(comparison.baselineOnly).toEqual([
      {
        packageName: "vite",
        severity: "moderate",
        url: "https://github.com/advisories/GHSA-resolved",
      },
    ]);
  });

  it("treats every current advisory as new when the baseline is empty", () => {
    const currentAdvisories = [
      {
        packageName: "esbuild",
        severity: "moderate",
        url: "https://github.com/advisories/GHSA-esbuild-moderate",
      },
      {
        packageName: "esbuild",
        severity: "low",
        url: "https://github.com/advisories/GHSA-esbuild-low",
      },
    ];

    const comparison = compareAuditToBaseline(currentAdvisories, {
      acceptedAdvisories: [],
      generatedAt: "2026-09-27",
      owner: "Platform engineering",
    });

    expect(comparison.newAdvisories).toEqual(currentAdvisories);
  });

  it("rejects an expired advisory baseline review date", () => {
    expect(() =>
      assertBaselineReviewCurrent(
        {
          acceptedAdvisories: [
            {
              packageName: "esbuild",
              severity: "moderate",
              url: "https://github.com/advisories/GHSA-67mh-4wv8-2f99",
            },
          ],
          generatedAt: "2026-07-10",
          owner: "Platform engineering",
          reviewBy: "2026-07-10",
        },
        new Date("2026-07-11T12:00:00.000Z")
      )
    ).toThrow("Dependency advisory baseline review expired on 2026-07-10.");
  });

  it("rejects an invalid advisory baseline review date", () => {
    expect(() =>
      assertBaselineReviewCurrent(
        {
          acceptedAdvisories: [
            {
              packageName: "esbuild",
              severity: "moderate",
              url: "https://github.com/advisories/GHSA-67mh-4wv8-2f99",
            },
          ],
          generatedAt: "2026-07-10",
          owner: "Platform engineering",
          reviewBy: "not-a-date",
        },
        new Date("2026-07-11T12:00:00.000Z")
      )
    ).toThrow("Dependency advisory baseline reviewBy must be an ISO date.");
  });

  it("accepts an advisory baseline through the review date", () => {
    expect(() =>
      assertBaselineReviewCurrent(
        {
          acceptedAdvisories: [
            {
              packageName: "esbuild",
              severity: "moderate",
              url: "https://github.com/advisories/GHSA-67mh-4wv8-2f99",
            },
          ],
          generatedAt: "2026-07-10",
          owner: "Platform engineering",
          reviewBy: "2026-07-11",
        },
        new Date("2026-07-11T23:59:59.000Z")
      )
    ).not.toThrow();
  });
});
