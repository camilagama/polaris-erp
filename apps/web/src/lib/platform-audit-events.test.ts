import { describe, expect, it, vi } from "vitest";
import { listPlatformAuditEvents } from "@/lib/platform-audit-events";

vi.mock("server-only", () => ({}));

describe("listPlatformAuditEvents", () => {
  it("returns redacted platform audit events", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          action: "organization.status_changed",
          actor_platform_admin_id: "platform-admin-1",
          actor_user_id: "user-1",
          created_at: new Date("2026-07-09T12:00:00.000Z"),
          id: "event-1",
          metadata: {
            reason: "contains support context",
            token: "secret-token",
          },
          subject_id: "org-1",
          subject_type: "organization",
        },
      ],
    });

    const events = await listPlatformAuditEvents(
      { action: "organization.status_changed" },
      { execute }
    );
    const serialized = JSON.stringify(events);

    expect(events).toEqual([
      {
        action: "organization.status_changed",
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        createdAt: "2026-07-09T12:00:00.000Z",
        id: "event-1",
        subjectId: "org-1",
        subjectType: "organization",
      },
    ]);
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("metadata");
  });
});
