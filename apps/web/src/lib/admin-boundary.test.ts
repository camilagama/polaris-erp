import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = join(process.cwd(), "..", "..");
const ADMIN_DIR = join(ROOT_DIR, "apps", "admin", "src");
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const WEB_ALIAS_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'](@\/[^"']+)["']/g;

const DECLARED_TEMPORARY_WEB_IMPORTS = new Set([
  "apps/admin/src/app/api/dev/bootstrap-platform-admin/route.ts -> @/lib/auth",
  "apps/admin/src/app/api/dev/bootstrap-platform-admin/route.ts -> @/lib/env",
  "apps/admin/src/app/api/dev/bootstrap-platform-admin/route.ts -> @/lib/platform-admin",
  "apps/admin/src/app/audit/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/audit/page.tsx -> @/lib/platform-audit-events",
  "apps/admin/src/app/billing/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/billing/page.tsx -> @/lib/platform-billing",
  "apps/admin/src/app/events/actions.ts -> @/lib/admin-rate-limit",
  "apps/admin/src/app/events/actions.ts -> @/lib/platform-admin-auth",
  "apps/admin/src/app/events/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/organizations/[organizationId]/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/organizations/[organizationId]/page.tsx -> @/lib/platform-directory",
  "apps/admin/src/app/organizations/[organizationId]/page.tsx -> @/lib/platform-support-notes",
  "apps/admin/src/app/organizations/actions.ts -> @/lib/admin-rate-limit",
  "apps/admin/src/app/organizations/actions.ts -> @/lib/platform-admin-auth",
  "apps/admin/src/app/organizations/actions.ts -> @/lib/platform-organization-mutations",
  "apps/admin/src/app/organizations/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/organizations/page.tsx -> @/lib/platform-directory",
  "apps/admin/src/app/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/page.tsx -> @/lib/platform-dashboard",
  "apps/admin/src/app/support-notes/actions.ts -> @/lib/admin-rate-limit",
  "apps/admin/src/app/support-notes/actions.ts -> @/lib/platform-admin-auth",
  "apps/admin/src/app/support-notes/actions.ts -> @/lib/platform-support-notes",
  "apps/admin/src/app/users/[userId]/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/users/[userId]/page.tsx -> @/lib/platform-directory",
  "apps/admin/src/app/users/[userId]/page.tsx -> @/lib/platform-support-notes",
  "apps/admin/src/app/users/page.tsx -> @/lib/platform-admin-auth",
  "apps/admin/src/app/users/page.tsx -> @/lib/platform-directory",
]);

const findTypeScriptFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...findTypeScriptFiles(path));
      continue;
    }

    if (TYPESCRIPT_SOURCE_FILE_PATTERN.test(entry)) {
      files.push(path);
    }
  }

  return files;
};

const findAdminWebAliasImports = (): string[] =>
  findTypeScriptFiles(ADMIN_DIR).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const relativeFile = relative(ROOT_DIR, file).replaceAll("\\", "/");

    return [...source.matchAll(WEB_ALIAS_IMPORT_PATTERN)].map(
      (match) => `${relativeFile} -> ${match[1]}`
    );
  });

describe("admin app boundaries", () => {
  it("does not expand temporary imports from the web app source tree", () => {
    const imports = findAdminWebAliasImports();
    const undeclaredImports = imports.filter(
      (importPath) => !DECLARED_TEMPORARY_WEB_IMPORTS.has(importPath)
    );

    expect(undeclaredImports).toEqual([]);
  });
});
