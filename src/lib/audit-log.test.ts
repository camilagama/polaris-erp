import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const dbModule = await import("@/db");

  return {
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      insert: MockFn;
      transaction: MockFn;
    },
  };
};

describe("recordActorAuditEvent", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.insert.mockReturnValue({
      values: () => Promise.resolve([]),
    });
  });

  it("writes audit events inside tenant database context", async () => {
    const { recordActorAuditEvent } = await import("@/lib/audit-log");
    const { mockDb } = await resolveMocks();

    await recordActorAuditEvent({
      actorUserId: "user-1",
      organizationId: "org_dg_imports",
      subjectId: "product-1",
      subjectType: "product",
      type: "product.updated",
    });

    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });
});
