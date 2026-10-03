import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readAppSource = (path: string) =>
  readFileSync(join(process.cwd(), "src", "app", "(dashboard)", path), "utf8");

describe("admin accessibility source checks", () => {
  it("gives filter inputs accessible names", () => {
    expect(readAppSource("organizations/page.tsx")).toContain(
      'aria-label="Buscar organizacoes"'
    );
    expect(readAppSource("users/page.tsx")).toContain(
      'aria-label="Buscar usuarios"'
    );
    const auditSource = readAppSource("audit/page.tsx");

    expect(auditSource).toContain('aria-label="Filtrar por action"');
    expect(auditSource).toContain('aria-label="Filtrar por subject type"');
    expect(auditSource).toContain('aria-label="Filtrar por subject ID"');
  });

  it("gives support-note textareas accessible names", () => {
    expect(readAppSource("organizations/[organizationId]/page.tsx")).toContain(
      'aria-label="Adicionar nota interna da organizacao"'
    );
    expect(readAppSource("users/[userId]/page.tsx")).toContain(
      'aria-label="Adicionar nota interna do usuario"'
    );
  });

  it("does not render dashboard cards without href as fake disabled links", () => {
    const source = readAppSource("page.tsx");

    expect(source).not.toContain("aria-disabled={!card.href}");
    expect(source).not.toContain('href={card.href ?? "/"}');
    expect(source).toContain("return card.href ? (");
    expect(source).toContain("<article");
  });

  it("uses horizontal overflow wrappers for fixed admin grids", () => {
    for (const path of [
      "audit/page.tsx",
      "organizations/[organizationId]/page.tsx",
      "users/[userId]/page.tsx",
    ]) {
      const source = readAppSource(path);

      expect(source).toContain("overflow-x-auto");
      expect(source).toContain("min-w-[");
    }
  });

  it("uses the shared responsive table wrapper for admin lists", () => {
    const tableSource = readFileSync(
      join(
        process.cwd(),
        "..",
        "..",
        "packages",
        "ui",
        "src",
        "components",
        "ui",
        "table.tsx"
      ),
      "utf8"
    );

    expect(tableSource).toContain("overflow-x-auto");
  });

  it("makes the audit table scroll region keyboard-accessible", () => {
    const auditSource = readAppSource("audit/page.tsx");

    expect(auditSource).toContain(
      'aria-label="Eventos de auditoria da plataforma"'
    );
    expect(auditSource).toContain("tabIndex={0}");
    expect(auditSource).toContain("focus-visible:ring-2");
  });

  it("renders audit events with native table semantics", () => {
    const auditSource = readAppSource("audit/page.tsx");

    expect(auditSource).toContain("<table");
    expect(auditSource).toContain("<caption");
    expect(auditSource).toContain('scope="col"');
    expect(auditSource).toContain('scope="row"');
  });
});
