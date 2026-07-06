import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialOrganizationForUser } from "@/lib/app-session";

const { dbMock, txMock } = vi.hoisted(() => {
  const txMock = {
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  };

  const dbMock = {
    transaction: vi.fn(async (callback) => callback(txMock)),
  };

  return { dbMock, txMock };
});

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: dbMock,
}));

const selectMembershipOnce = (organizationId: string) => {
  txMock.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ organizationId }]),
        }),
      }),
    }),
  });
};

describe("createInitialOrganizationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));
  });

  it("locks onboarding per user before reading existing membership", async () => {
    selectMembershipOnce("org-existing");

    const organizationId = await createInitialOrganizationForUser({
      name: "Polaris Brasil",
      userId: "user-1",
    });

    expect(organizationId).toBe("org-existing");
    expect(txMock.execute).toHaveBeenCalledTimes(1);
    expect(txMock.execute.mock.invocationCallOrder[0]).toBeLessThan(
      txMock.select.mock.invocationCallOrder[0]
    );
  });
});
