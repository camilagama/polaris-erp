import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface BunAuditAdvisory {
  severity: string;
  title: string;
  url: string;
}

type BunAuditJson = Record<string, BunAuditAdvisory[]>;

interface BaselineAdvisory {
  packageName: string;
  severity: string;
  url: string;
}

interface AdvisoryBaseline {
  acceptedAdvisories: BaselineAdvisory[];
  generatedAt: string;
  owner: string;
  reviewBy: string;
}

export interface AuditComparison {
  baselineOnly: BaselineAdvisory[];
  current: BaselineAdvisory[];
  newAdvisories: BaselineAdvisory[];
}

const BASELINE_PATH = join(
  process.cwd(),
  "docs",
  "security",
  "dependency-advisory-baseline.json"
);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseAuditJsonFromOutput = (output: string): BunAuditJson => {
  const jsonStart = output.indexOf("{");

  if (jsonStart === -1) {
    throw new Error("bun audit --json did not emit a JSON object.");
  }

  return JSON.parse(output.slice(jsonStart)) as BunAuditJson;
};

export const flattenAuditAdvisories = (
  auditJson: BunAuditJson
): BaselineAdvisory[] =>
  Object.entries(auditJson)
    .flatMap(([packageName, advisories]) =>
      advisories.map((advisory) => ({
        packageName,
        severity: advisory.severity,
        url: advisory.url,
      }))
    )
    .sort((left, right) => left.url.localeCompare(right.url));

export const compareAuditToBaseline = (
  current: BaselineAdvisory[],
  baseline: AdvisoryBaseline
): AuditComparison => {
  const baselineUrls = new Set(
    baseline.acceptedAdvisories.map((advisory) => advisory.url)
  );
  const currentUrls = new Set(current.map((advisory) => advisory.url));

  return {
    baselineOnly: baseline.acceptedAdvisories.filter(
      (advisory) => !currentUrls.has(advisory.url)
    ),
    current,
    newAdvisories: current.filter(
      (advisory) => !baselineUrls.has(advisory.url)
    ),
  };
};

export const assertBaselineReviewCurrent = (
  baseline: AdvisoryBaseline,
  now = new Date()
): void => {
  if (!ISO_DATE_PATTERN.test(baseline.reviewBy)) {
    throw new Error(
      "Dependency advisory baseline reviewBy must be an ISO date."
    );
  }

  const reviewDeadline = new Date(`${baseline.reviewBy}T23:59:59.999Z`);

  if (Number.isNaN(reviewDeadline.getTime())) {
    throw new Error(
      "Dependency advisory baseline reviewBy must be an ISO date."
    );
  }

  if (now.getTime() > reviewDeadline.getTime()) {
    throw new Error(
      `Dependency advisory baseline review expired on ${baseline.reviewBy}.`
    );
  }
};

const loadBaseline = (): AdvisoryBaseline =>
  JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as AdvisoryBaseline;

const runBunAuditJson = (): string => {
  const audit = spawnSync("bun", ["audit", "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  return `${audit.stderr}\n${audit.stdout}`;
};

const main = (): void => {
  const baseline = loadBaseline();
  assertBaselineReviewCurrent(baseline);
  const auditJson = parseAuditJsonFromOutput(runBunAuditJson());
  const current = flattenAuditAdvisories(auditJson);
  const comparison = compareAuditToBaseline(current, baseline);

  if (comparison.newAdvisories.length > 0) {
    console.error(
      "New dependency advisories found beyond the accepted baseline:"
    );

    for (const advisory of comparison.newAdvisories) {
      console.error(
        `- ${advisory.severity}: ${advisory.packageName} ${advisory.url}`
      );
    }

    process.exit(1);
  }

  console.log(
    `bun audit baseline accepted ${comparison.current.length} current advisories.`
  );

  if (comparison.baselineOnly.length > 0) {
    console.log(
      `${comparison.baselineOnly.length} baseline advisories are no longer reported and should be removed during the next review.`
    );
  }
};

if (import.meta.main) {
  main();
}
