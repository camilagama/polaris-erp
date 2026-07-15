import {
  createPlatformSupportCase,
  listPlatformSupportCases,
  updatePlatformSupportCase,
} from "@polaris/platform/support-cases";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createTxMock = () => {
  const execute = vi.fn().mockResolvedValue({ rows: [{ exists: 1 }] });
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { execute, insert, values };
};

describe("platform support cases", () => {
  it("requires a target, bounded reason and known kind", async () => {
    const tx = createTxMock();
    const db = { transaction: vi.fn(async (callback) => callback(tx)) };

    await expect(
      createPlatformSupportCase(
        {
          createdByPlatformAdminId: "platform-admin-1",
          kind: "support",
          reason: " ",
        },
        db as never
      )
    ).rejects.toThrow("requires a reason");

    await expect(
      createPlatformSupportCase(
        {
          createdByPlatformAdminId: "platform-admin-1",
          kind: "support",
          reason: "Customer asked for a review.",
        },
        db as never
      )
    ).rejects.toThrow("requires a target");

    await expect(
      createPlatformSupportCase(
        {
          createdByPlatformAdminId: "platform-admin-1",
          customerUserId: "user-1",
          kind: "unknown" as never,
          reason: "Customer asked for a review.",
        },
        db as never
      )
    ).rejects.toThrow("kind is invalid");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("creates a manual data-subject request and an audit event atomically", async () => {
    const tx = createTxMock();
    const db = { transaction: vi.fn(async (callback) => callback(tx)) };

    await createPlatformSupportCase(
      {
        createdByPlatformAdminId: "platform-admin-1",
        customerUserId: "user-1",
        kind: "data_subject_request",
        organizationId: "org-1",
        reason:
          "Request received through support; manual identity verification pending.",
      },
      db as never
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        customerUserId: "user-1",
        kind: "data_subject_request",
        organizationId: "org-1",
      })
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "support_case.created",
        actorPlatformAdminId: "platform-admin-1",
        subjectType: "support_case",
      })
    );
  });

  it("lists only safe case metadata and omits the free-text reason", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          closed_at: null,
          created_at: new Date("2026-07-15T12:00:00.000Z"),
          created_by_platform_admin_id: "platform-admin-1",
          customer_user_id: "user-1",
          id: "case-1",
          kind: "data_subject_request",
          organization_id: "org-1",
          reason: "Do not expose this free text.",
          requester_verified_at: null,
          resolution: null,
          status: "open",
          updated_at: new Date("2026-07-15T12:00:00.000Z"),
        },
      ],
    });

    const cases = await listPlatformSupportCases(
      { customerUserId: "user-1" },
      { execute }
    );

    expect(cases).toHaveLength(1);
    expect(JSON.stringify(cases)).not.toContain("Do not expose");
    expect(JSON.stringify(cases)).not.toContain("reason");
  });

  it("requires manual DSR verification before advancing a case", async () => {
    const tx = createTxMock();
    tx.execute.mockResolvedValueOnce({
      rows: [{ kind: "data_subject_request" }],
    });
    const db = { transaction: vi.fn(async (callback) => callback(tx)) };

    await expect(
      updatePlatformSupportCase(
        {
          actorPlatformAdminId: "platform-admin-1",
          caseId: "case-1",
          requesterVerified: false,
          status: "in_review",
        },
        db as never
      )
    ).rejects.toThrow("require manual requester verification");

    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("closes a verified DSR with an audit event that omits the resolution", async () => {
    const tx = createTxMock();
    tx.execute
      .mockResolvedValueOnce({ rows: [{ kind: "data_subject_request" }] })
      .mockResolvedValueOnce({ rows: [{ id: "case-1" }] });
    const db = { transaction: vi.fn(async (callback) => callback(tx)) };

    await updatePlatformSupportCase(
      {
        actorPlatformAdminId: "platform-admin-1",
        caseId: "case-1",
        requesterVerified: true,
        resolution: "The verified request was handled manually.",
        status: "closed",
      },
      db as never
    );

    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "support_case.updated",
        metadata: {
          kind: "data_subject_request",
          requesterVerified: true,
          status: "closed",
        },
      })
    );
    expect(JSON.stringify(tx.values.mock.calls)).not.toContain(
      "The verified request was handled manually."
    );
  });
});
