import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adminPageSource = readFileSync(
  join(process.cwd(), "..", "admin", "src", "app", "page.tsx"),
  "utf8"
);
const adminForbiddenSource = readFileSync(
  join(process.cwd(), "..", "admin", "src", "app", "forbidden.tsx"),
  "utf8"
);
const adminOrganizationListSource = readFileSync(
  join(process.cwd(), "..", "admin", "src", "app", "organizations", "page.tsx"),
  "utf8"
);
const adminOrganizationDetailSource = readFileSync(
  join(
    process.cwd(),
    "..",
    "admin",
    "src",
    "app",
    "organizations",
    "[organizationId]",
    "page.tsx"
  ),
  "utf8"
);
const adminOrganizationActionsPath = join(
  process.cwd(),
  "..",
  "admin",
  "src",
  "app",
  "organizations",
  "actions.ts"
);
const adminUserListSource = readFileSync(
  join(process.cwd(), "..", "admin", "src", "app", "users", "page.tsx"),
  "utf8"
);
const adminUserDetailSource = readFileSync(
  join(
    process.cwd(),
    "..",
    "admin",
    "src",
    "app",
    "users",
    "[userId]",
    "page.tsx"
  ),
  "utf8"
);
const adminSupportNoteActionsPath = join(
  process.cwd(),
  "..",
  "admin",
  "src",
  "app",
  "support-notes",
  "actions.ts"
);

describe("admin app protection", () => {
  it("guards the admin root route with platform admin authorization", () => {
    expect(adminPageSource).toContain("requirePlatformAdmin");
    expect(adminPageSource).toContain("getPlatformDashboardData");
    expect(adminPageSource).toContain("forbidden()");
    expect(adminPageSource).toContain("await connection()");
    expect(adminPageSource).not.toContain("notFound()");
  });

  it("renders a dedicated forbidden state for denied internal access", () => {
    expect(adminForbiddenSource).toContain("Acesso negado");
    expect(adminForbiddenSource).toContain("platform admin");
    expect(adminForbiddenSource).toContain("Cloudflare Access");
  });

  it("guards admin organization and user directory routes", () => {
    const protectedSources = [
      adminOrganizationListSource,
      adminOrganizationDetailSource,
      adminUserListSource,
      adminUserDetailSource,
    ];

    for (const source of protectedSources) {
      expect(source).toContain("requirePlatformAdmin");
      expect(source).toContain("forbidden()");
      expect(source).toContain("await connection()");
    }
    expect(adminOrganizationListSource).toContain("listPlatformOrganizations");
    expect(adminOrganizationDetailSource).toContain(
      "getPlatformOrganizationDetail"
    );
    expect(adminUserListSource).toContain("listPlatformUsers");
    expect(adminUserDetailSource).toContain("getPlatformUserDetail");
  });

  it("protects organization status mutations with platform operator authorization and confirmation", () => {
    expect(existsSync(adminOrganizationActionsPath)).toBe(true);

    const actionSource = readFileSync(adminOrganizationActionsPath, "utf8");

    expect(actionSource).toContain("use server");
    expect(actionSource).toContain("requirePlatformAdmin");
    expect(actionSource).toContain('minimumRole: "operator"');
    expect(actionSource).toContain("updatePlatformOrganizationStatus");
    expect(adminOrganizationDetailSource).toContain(
      "changeOrganizationStatusAction"
    );
    expect(adminOrganizationDetailSource).toContain('name="reason"');
    expect(adminOrganizationDetailSource).toContain('name="confirm"');
  });

  it("protects internal support notes and keeps them out of the customer app", () => {
    expect(existsSync(adminSupportNoteActionsPath)).toBe(true);

    const actionSource = readFileSync(adminSupportNoteActionsPath, "utf8");

    expect(actionSource).toContain("use server");
    expect(actionSource).toContain("requirePlatformAdmin");
    expect(actionSource).toContain('minimumRole: "support"');
    expect(actionSource).toContain("createPlatformSupportNote");
    expect(adminOrganizationDetailSource).toContain("createSupportNoteAction");
    expect(adminUserDetailSource).toContain("createSupportNoteAction");
    expect(adminOrganizationDetailSource).toContain("listPlatformSupportNotes");
    expect(adminUserDetailSource).toContain("listPlatformSupportNotes");
    expect(adminPageSource).not.toContain("platform_support_notes");
  });
});
