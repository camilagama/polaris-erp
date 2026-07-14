import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REQUIRED_PRODUCTION_PREFLIGHT_ENV } from "../apps/web/src/ops/production-preflight";

const workspaceRoot = process.cwd();
const envAssignmentPattern = /^([A-Z][A-Z0-9_]*)=/gm;
const workflowEnvPattern = /^ {10}([A-Z][A-Z0-9_]*):/gm;
const nextWorkflowJobPattern = /\n {2}[a-z][a-z-]*:\n/;

const collectVariableNames = (source: string, pattern: RegExp): Set<string> =>
  new Set([...source.matchAll(pattern)].map((match) => match[1]));

const getProductionPreflightWorkflowSection = (workflow: string): string => {
  const jobStart = workflow.indexOf("  production-preflight:\n");

  if (jobStart === -1) {
    throw new Error(
      "CI workflow does not define the production-preflight job."
    );
  }

  const remainingWorkflow = workflow.slice(jobStart + 1);
  const nextJobOffset = remainingWorkflow.search(nextWorkflowJobPattern);

  return workflow.slice(
    jobStart,
    nextJobOffset === -1 ? undefined : jobStart + 1 + nextJobOffset
  );
};

const formatMissingVariables = (variables: readonly string[]): string =>
  variables.join(", ");

const main = (): void => {
  const exampleEnv = readFileSync(join(workspaceRoot, ".env.example"), "utf8");
  const workflow = readFileSync(
    join(workspaceRoot, ".github/workflows/ci.yml"),
    "utf8"
  );
  const exampleVariables = collectVariableNames(
    exampleEnv,
    envAssignmentPattern
  );
  const workflowVariables = collectVariableNames(
    getProductionPreflightWorkflowSection(workflow),
    workflowEnvPattern
  );
  const missingFromExample = REQUIRED_PRODUCTION_PREFLIGHT_ENV.filter(
    (variable) => !exampleVariables.has(variable)
  );
  const missingFromWorkflow = REQUIRED_PRODUCTION_PREFLIGHT_ENV.filter(
    (variable) => !workflowVariables.has(variable)
  );

  if (missingFromExample.length === 0 && missingFromWorkflow.length === 0) {
    return;
  }

  const errors: string[] = [];

  if (missingFromExample.length > 0) {
    errors.push(
      `.env.example is missing: ${formatMissingVariables(missingFromExample)}`
    );
  }

  if (missingFromWorkflow.length > 0) {
    errors.push(
      `production-preflight CI env is missing: ${formatMissingVariables(missingFromWorkflow)}`
    );
  }

  throw new Error(
    `Production environment contract mismatch:\n${errors.join("\n")}`
  );
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
