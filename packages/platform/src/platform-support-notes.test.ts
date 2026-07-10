import {
  createPlatformSupportNote,
  listPlatformSupportNotes,
} from "@polaris/platform/support-notes";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createTxMock = () => {
  const execute = vi.fn().mockResolvedValue({ rows: [{ exists: 1 }] });
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { execute, insert, values };
};

describe("platform support notes", () => {
  it("requires a body and at least one target", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      createPlatformSupportNote(
        {
          authorPlatformAdminId: "platform-admin-1",
          body: " ",
        },
        db as never
      )
    ).rejects.toThrow("requires a body");

    await expect(
      createPlatformSupportNote(
        {
          authorPlatformAdminId: "platform-admin-1",
          body: "Support context",
        },
        db as never
      )
    ).rejects.toThrow("requires a target");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("creates a support note and platform audit in one transaction", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await createPlatformSupportNote(
      {
        authorPlatformAdminId: "platform-admin-1",
        body: "Customer requested temporary review.",
        customerUserId: "user-1",
        organizationId: "org-1",
      },
      db as never
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        authorPlatformAdminId: "platform-admin-1",
        body: "Customer requested temporary review.",
        customerUserId: "user-1",
        organizationId: "org-1",
      })
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "support_note.created",
        actorPlatformAdminId: "platform-admin-1",
        metadata: {
          hasCustomerUserId: true,
          hasOrganizationId: true,
        },
        subjectId: "org-1",
        subjectType: "support_note",
      })
    );
  });

  it("rejects notes that link a user outside the target organization", async () => {
    const tx = createTxMock();
    tx.execute.mockResolvedValueOnce({ rows: [] });
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      createPlatformSupportNote(
        {
          authorPlatformAdminId: "platform-admin-1",
          body: "Customer requested temporary review.",
          customerUserId: "user-outside",
          organizationId: "org-1",
        },
        db as never
      )
    ).rejects.toThrow("does not belong to organization");

    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.values).not.toHaveBeenCalled();
  });

  it("lists support notes without exposing metadata fields", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          author_platform_admin_id: "platform-admin-1",
          body: "Review completed.",
          created_at: new Date("2026-07-09T12:00:00.000Z"),
          customer_user_id: "user-1",
          id: "note-1",
          metadata: { secret: "raw-secret" },
          organization_id: "org-1",
          updated_at: new Date("2026-07-09T12:30:00.000Z"),
        },
      ],
    });

    const notes = await listPlatformSupportNotes(
      { organizationId: "org-1" },
      { execute }
    );
    const serialized = JSON.stringify(notes);

    expect(notes).toEqual([
      {
        authorPlatformAdminId: "platform-admin-1",
        body: "Review completed.",
        createdAt: "2026-07-09T12:00:00.000Z",
        customerUserId: "user-1",
        id: "note-1",
        organizationId: "org-1",
        updatedAt: "2026-07-09T12:30:00.000Z",
      },
    ]);
    expect(serialized).not.toContain("raw-secret");
    expect(serialized).not.toContain("metadata");
  });

  it("uses both organization and user filters together when both are supplied", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });

    await listPlatformSupportNotes(
      { customerUserId: "user-1", organizationId: "org-1" },
      { execute }
    );

    const querySource = JSON.stringify(execute.mock.calls[0]?.[0]);

    expect(querySource).toContain("organization_id");
    expect(querySource).toContain("customer_user_id");
    expect(querySource).toContain("and");
    expect(querySource).not.toContain(" or ");
  });
});
