import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readAuthSource = () =>
  readFileSync(join(import.meta.dirname, "auth.ts"), "utf8").replaceAll(
    "\r\n",
    "\n"
  );

describe("Polaris authentication policy", () => {
  it("disables implicit account linking by email", () => {
    expect(readAuthSource()).toContain("disableImplicitLinking: true");
  });

  it("blocks acceptance of legacy organization invitations", () => {
    expect(readAuthSource()).toContain(
      "beforeAcceptInvitation: rejectWorkspaceUserManagement"
    );
  });

  it("maps organization plugin models to their existing singular tables", () => {
    const source = readAuthSource();

    expect(source).toContain(
      'invitation: {\n        modelName: "invitation",\n      },'
    );
    expect(source).toContain(
      'member: {\n        modelName: "member",\n      },'
    );
    expect(source).toContain('modelName: "organization"');
    expect(source).toContain("usePlural: false");
    expect(source).toContain("account: accounts");
    expect(source).toContain("session: sessions");
    expect(source).toContain("user: users");
    expect(source).toContain("verification: verifications");
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
