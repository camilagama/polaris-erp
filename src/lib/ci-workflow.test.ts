import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readCiWorkflow = () =>
  readFileSync(join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8");

const RLS_DATABASE_URL_SECRET_PATTERN =
  /DATABASE_URL:\s*\$\{\{\s*secrets\.RLS_DATABASE_URL\s*\}\}/;

describe("CI workflow", () => {
  it("exposes RLS smoke as a manual secret-gated job", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("rls-smoke:");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("secrets.RLS_DATABASE_URL");
    expect(workflow).toMatch(RLS_DATABASE_URL_SECRET_PATTERN);
    expect(workflow).toContain("bun run db:smoke:rls");
  });
});
