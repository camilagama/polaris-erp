import { describe, expect, it } from "vitest";
import {
  compareAuditToBaseline,
  flattenAuditAdvisories,
  parseAuditJsonFromOutput,
} from "../../../../scripts/check-bun-audit-baseline";

describe("dependency advisory baseline guard", () => {
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
});
