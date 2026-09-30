import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const checkerPath = fileURLToPath(new URL("./check-docs.ts", import.meta.url));
const fixtureParents: string[] = [];

const createFixture = (): string => {
  const parent = mkdtempSync(join(tmpdir(), "polaris-docs-check-"));
  const root = join(parent, "polaris");
  fixtureParents.push(parent);
  mkdirSync(join(root, "docs"), { recursive: true });

  for (const file of [
    "README.md",
    "AGENTS.md",
    "PRODUCT.md",
    "DESIGN.md",
    "CONTEXT.md",
  ]) {
    writeFileSync(join(root, file), `# ${file}\n`, "utf8");
  }

  writeFileSync(
    join(root, "docs", "README.md"),
    "# Docs\n\n## Fontes canônicas e estado de reconciliação\n[Regras](business-rules/normative/README.md)\n\n## Material histórico e planos\n",
    "utf8"
  );
  writeFixtureFile(
    root,
    "docs/business-rules/normative/README.md",
    "[Regras aprovadas](approved-rules.md)\n"
  );
  writeFixtureFile(
    root,
    "docs/business-rules/normative/approved-rules.md",
    "### AUTH-001 — Rule\n[DEC-BR-001]\n"
  );
  writeFixtureFile(
    root,
    "docs/business-rules/decision-register.md",
    "| DEC-BR-001 | Decision |\n"
  );
  writeFixtureFile(
    root,
    "docs/business-rules/normative/individual-rule-profiles.md",
    "| AUTH-001 | Profile | [DEC-BR-001] |\n"
  );
  writeFixtureFile(
    root,
    "docs/business-rules/normative/adherence-by-rule.md",
    "| AUTH-001 | Status |\n"
  );
  writeFixtureFile(
    root,
    "docs/business-rules/decision-coverage.md",
    "| Billing | DEC-BR-001 |\n"
  );

  return root;
};

const writeFixtureFile = (
  root: string,
  relativePath: string,
  content: string
): void => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
};

const runChecker = (
  root: string
): { output: string; status: number | null } => {
  const result = spawnSync(process.execPath, [checkerPath], {
    cwd: root,
    encoding: "utf8",
  });

  return {
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status,
  };
};

afterEach(() => {
  for (const parent of fixtureParents.splice(0)) {
    rmSync(parent, { force: true, recursive: true });
  }
});

describe("docs:check", () => {
  it("rejects a broken local heading anchor", () => {
    const root = createFixture();
    writeFixtureFile(root, "docs/guide.md", "# Billing setup\n");
    writeFixtureFile(
      root,
      "README.md",
      "[Guide](docs/guide.md#missing-heading)\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("missing-heading");
  });

  it("uses GitHub duplicate-heading slugs for anchors", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/guide.md",
      "# Billing setup\n## Billing setup\n"
    );
    writeFixtureFile(
      root,
      "README.md",
      "[Second heading](docs/guide.md#billing-setup-1)\n"
    );

    const result = runChecker(root);

    expect(result.status).toBe(0);
  });

  it("keeps anchor checks scoped away from historical snapshots", () => {
    const root = createFixture();
    writeFixtureFile(root, "docs/current.md", "# Current heading\n");
    writeFixtureFile(
      root,
      "docs/archive.md",
      "---\nstatus: historical\nsnapshot_date: 2026-07-12\n---\n[Old link](current.md#removed-heading)\n"
    );

    const result = runChecker(root);

    expect(result.status).toBe(0);
  });

  it("checks canonical root contracts in addition to README and docs", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "PRODUCT.md",
      "[Missing](missing-product-contract.md)\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("missing-product-contract.md");
  });

  it("does not treat link-shaped code examples as Markdown links", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "README.md",
      "```md\n[example](missing-example.md)\n```\n"
    );

    const result = runChecker(root);

    expect(result.status).toBe(0);
  });

  it("does not treat an absolute Windows source reference as a workspace link", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/report.md",
      "[External source](/c:/Users/Junior/Hub/src/example.ts:12)\n"
    );

    const result = runChecker(root);

    expect(result.status).toBe(0);
  });

  it("rejects a path that escapes the workspace through a sibling prefix", () => {
    const root = createFixture();
    const sibling = join(dirname(root), "polaris-sibling");
    mkdirSync(sibling, { recursive: true });
    writeFileSync(join(sibling, "outside.md"), "# Outside\n", "utf8");
    writeFixtureFile(
      root,
      "README.md",
      "[Outside](../polaris-sibling/outside.md)\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("../polaris-sibling/outside.md");
  });

  it("validates lifecycle metadata only when a document declares it", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/old-plan.md",
      "---\nexecution_status: superseded\nsuperseded_by:\n  - missing-plan.md\n---\n# Old plan\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("missing-plan.md");
  });

  it("rejects malformed YAML frontmatter", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/malformed.md",
      "---\nexecution_status: [superseded\n---\n# Malformed\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("invalid YAML frontmatter");
  });

  it("rejects execution lifecycle values outside the approved set", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/unclassified-plan.md",
      "---\nexecution_status: paused\n---\n# Plan\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain(
      "execution_status must be active, completed, or superseded"
    );
  });

  it("requires a visible warning on superseded execution plans", () => {
    const root = createFixture();
    writeFixtureFile(root, "docs/replacement-plan.md", "# Replacement\n");
    writeFixtureFile(
      root,
      "docs/old-plan.md",
      "---\nexecution_status: superseded\nsuperseded_by:\n  - replacement-plan.md\n---\n# Old plan\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Não executar");
  });

  it("rejects duplicate canonical rule IDs", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/business-rules/normative/approved-rules.md",
      "### AUTH-001 — First rule\n\n### AUTH-001 — Duplicate rule\n"
    );
    writeFixtureFile(
      root,
      "docs/business-rules/decision-register.md",
      "| DEC-BR-001 | Decision |\n"
    );
    writeFixtureFile(
      root,
      "docs/business-rules/normative/individual-rule-profiles.md",
      "| AUTH-001 | Profile | DEC-BR-001 |\n"
    );
    writeFixtureFile(
      root,
      "docs/business-rules/normative/adherence-by-rule.md",
      "| AUTH-001 | Status |\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("AUTH-001");
  });

  it("rejects a decision reference without a canonical destination", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "docs/business-rules/normative/approved-rules.md",
      "### AUTH-001 — Rule\n[DEC-BR-001]\n"
    );
    writeFixtureFile(
      root,
      "docs/business-rules/decision-register.md",
      "| DEC-BR-001 | Decision |\n"
    );
    writeFixtureFile(
      root,
      "docs/business-rules/normative/individual-rule-profiles.md",
      "| AUTH-001 | Profile | [DEC-BR-999] |\n"
    );
    writeFixtureFile(
      root,
      "docs/business-rules/normative/adherence-by-rule.md",
      "| AUTH-001 | Status |\n"
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("DEC-BR-999");
  });
});
