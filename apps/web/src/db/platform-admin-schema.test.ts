import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(
  join(process.cwd(), "../../packages/db/src/schema.ts"),
  "utf8"
);

describe("platform admin schema", () => {
  it("models platform admins with an isolated administrative identity", () => {
    expect(schemaSource).toContain('"platform_admins"');
    expect(schemaSource).toContain('adminUserId: text("admin_user_id")');
    expect(schemaSource).toContain(
      'uniqueIndex("platform_admins_admin_user_id_unique_idx")'
    );
    expect(schemaSource).toContain('"admin_users"');
    expect(schemaSource).toContain('"admin_sessions"');
    expect(schemaSource).toContain('"platform_admin_enrollments"');
    expect(schemaSource).not.toContain(
      'platformAdmins = pgTable(\n  "platform_admins",\n  {\n    organizationId'
    );
  });

  it("keeps platform audit events independent from tenant audit_events", () => {
    expect(schemaSource).toContain('"platform_audit_events"');
    expect(schemaSource).toContain('action: text("action").notNull()');
    expect(schemaSource).toContain(
      'actorPlatformAdminId: uuid("actor_platform_admin_id")'
    );
    expect(schemaSource).not.toContain(
      'platformAuditEvents = pgTable(\n  "platform_audit_events",\n  {\n    organizationId'
    );
  });

  it("models support notes as internal platform records with optional customer context", () => {
    expect(schemaSource).toContain('"platform_support_notes"');
    expect(schemaSource).toContain('organizationId: text("organization_id")');
    expect(schemaSource).toContain('customerUserId: text("customer_user_id")');
  });
});
