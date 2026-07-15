import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readAuthSource = () =>
  readFileSync(join(import.meta.dirname, "auth.ts"), "utf8");

describe("Polaris authentication policy", () => {
  it("disables implicit account linking by email", () => {
    expect(readAuthSource()).toContain("disableImplicitLinking: true");
  });

  it("blocks acceptance of legacy organization invitations", () => {
    expect(readAuthSource()).toContain(
      "beforeAcceptInvitation: rejectWorkspaceUserManagement"
    );
  });

  it("uses a seven-day sliding inactivity window", () => {
    const source = readAuthSource();

    expect(source).toContain("expiresIn: 60 * 60 * 24 * 7");
    expect(source).toContain("updateAge: 60 * 60 * 24");
  });

  it("audits every Better Auth session deletion", () => {
    const source = readAuthSource();

    expect(source).toContain("delete: {");
    expect(source).toContain(
      "recordAuthSessionAuditEvent?.({ context, session })"
    );
  });
});
