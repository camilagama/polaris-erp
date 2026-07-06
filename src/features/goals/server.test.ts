import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/dashboard/server", () => ({
  getDashboardMetrics: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      goals: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    update: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const activeGoalRow = {
  displayMode: "percentage",
  id: "550e8400-e29b-41d4-a716-446655440000",
  metric: "revenue",
  name: "Meta ativa",
  periodEnd: "2099-12-31",
  periodStart: "2099-01-01",
  status: "active",
  targetValue: "100.00",
};

const archivedGoalRow = {
  ...activeGoalRow,
  status: "archived",
};

const resolveMocks = async () => {
  const dashboardServer = await import("@/features/dashboard/server");
  const dbModule = await import("@/db");

  return {
    mockDb: dbModule.db as unknown as {
      query: {
        goals: {
          findFirst: MockFn;
        };
      };
      select: MockFn;
      update: MockFn;
    },
    mockGetDashboardMetrics: dashboardServer.getDashboardMetrics as MockFn,
  };
};

const mockLostGoalUpdate = async () => {
  const { mockDb } = await resolveMocks();

  mockDb.update.mockReturnValue({
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve([]),
      }),
    }),
  });
};

describe("goals server writes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb, mockGetDashboardMetrics } = await resolveMocks();

    mockDb.select.mockReturnValue({
      from: () => ({
        where: async () => [{ value: 0 }],
      }),
    });
    mockGetDashboardMetrics.mockResolvedValue({
      totalResult: 0,
      totalSalesCount: 0,
      totalSold: 50,
    });
  });

  it("does not treat a lost active goal update race as success", async () => {
    const { updateGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(activeGoalRow);
    await mockLostGoalUpdate();

    await expect(
      updateGoal("org_dg_imports", {
        displayMode: "absolute",
        id: activeGoalRow.id,
        metric: "profit",
        name: "Meta atualizada",
        periodEnd: "2099-12-31",
        periodStart: "2099-01-01",
        targetValue: 200,
      })
    ).rejects.toThrow("Meta nao encontrada ou nao esta ativa.");
  });

  it("does not treat a lost goal archive race as success", async () => {
    const { archiveGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(activeGoalRow);
    await mockLostGoalUpdate();

    await expect(
      archiveGoal("org_dg_imports", activeGoalRow.id)
    ).rejects.toThrow("Meta nao encontrada.");
  });

  it("does not treat a lost goal unarchive race as success", async () => {
    const { unarchiveGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(archivedGoalRow);
    await mockLostGoalUpdate();

    await expect(
      unarchiveGoal("org_dg_imports", archivedGoalRow.id)
    ).rejects.toThrow("Meta nao encontrada.");
  });
});
