import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const scriptSource = readFileSync(
  join(process.cwd(), "..", "..", "scripts", "bootstrap-platform-admin.ts"),
  "utf8"
);
const packageSource = readFileSync(
  join(process.cwd(), "..", "..", "package.json"),
  "utf8"
);

describe("platform admin bootstrap script", () => {
  it("uses only the direct migration URL", () => {
    expect(scriptSource).toContain('getRequiredEnv("DATABASE_URL_DIRECT")');
    expect(scriptSource).not.toContain('getRequiredEnv("DATABASE_URL")');
  });

  it("creates an audited administrative enrollment transactionally", () => {
    expect(scriptSource).toContain("begin");
    expect(scriptSource).toContain("commit");
    expect(scriptSource).toContain("rollback");
    expect(scriptSource).toContain("public.platform_admins");
    expect(scriptSource).toContain("public.platform_admin_enrollments");
    expect(scriptSource).toContain("public.platform_audit_events");
    expect(scriptSource).toContain("platform_admin.enrollment_bootstrapped");
  });

  it("is exposed as an explicit root script", () => {
    expect(packageSource).toContain("platform-admin:bootstrap");
    expect(packageSource).toContain("scripts/bootstrap-platform-admin.ts");
  });
});
