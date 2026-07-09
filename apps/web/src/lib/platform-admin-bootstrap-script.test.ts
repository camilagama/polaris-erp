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
  it("uses the migration URL and refuses runtime URL reuse", () => {
    expect(scriptSource).toContain('getRequiredEnv("DATABASE_URL_DIRECT")');
    expect(scriptSource).toContain("DATABASE_URL");
    expect(scriptSource).toContain("must be distinct from DATABASE_URL");
  });

  it("creates an audited platform admin grant transactionally", () => {
    expect(scriptSource).toContain("begin");
    expect(scriptSource).toContain("commit");
    expect(scriptSource).toContain("rollback");
    expect(scriptSource).toContain("public.platform_admins");
    expect(scriptSource).toContain("public.platform_admin_grants");
    expect(scriptSource).toContain("public.platform_audit_events");
    expect(scriptSource).toContain("platform_admin.bootstrap");
  });

  it("is exposed as an explicit root script", () => {
    expect(packageSource).toContain("platform-admin:bootstrap");
    expect(packageSource).toContain("scripts/bootstrap-platform-admin.ts");
  });
});
