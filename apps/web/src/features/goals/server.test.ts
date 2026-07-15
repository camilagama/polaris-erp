import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/dashboard/server", () => ({
  getDashboardMetrics: vi.fn(),
}));

const entitlementMocks = vi.hoisted(() => ({
  getOrganizationPlanEntitlements: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({
  getOrganizationPlanEntitlements:
    entitlementMocks.getOrganizationPlanEntitlements,
}));

vi.mock("@polaris/db", () => ({
  db: {
    query: {
      goals: {
        findFirst: vi.fn(),
      },
    },
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
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
  const dbModule = await import("@polaris/db");

  return {
    mockDb: dbModule.db as unknown as {
      query: {
        goals: {
          findFirst: MockFn;
        };
      };
      execute: MockFn;
      insert: MockFn;
      select: MockFn;
      transaction: MockFn;
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

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.select.mockReturnValue({
      from: () => ({
        where: async () => [{ value: 0 }],
      }),
    });
    entitlementMocks.getOrganizationPlanEntitlements.mockResolvedValue({
      maxActiveGoals: 1,
      maxImagesPerProduct: 1,
      maxRegisteredProducts: 50,
    });
    mockGetDashboardMetrics.mockResolvedValue({
      totalResult: 0,
      totalSalesCount: 0,
      totalSold: 50,
    });
  });

  it("runs active goal update inside tenant database context", async () => {
    const { updateGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(activeGoalRow);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: activeGoalRow.id }]),
        }),
      }),
    });

    await updateGoal(
      "org_dg_imports",
      {
        displayMode: "absolute",
        id: activeGoalRow.id,
        metric: "profit",
        name: "Meta atualizada",
        periodEnd: "2099-12-31",
        periodStart: "2099-01-01",
        targetValue: 200,
      },
      "user-1"
    );

    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });

  it("propagates audit failures from the same goal creation transaction", async () => {
    const { createGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();
    const goalValues = vi.fn().mockResolvedValue(undefined);
    const auditValues = vi.fn().mockRejectedValue(new Error("audit failed"));

    mockDb.insert
      .mockReturnValueOnce({ values: goalValues })
      .mockReturnValueOnce({ values: auditValues });

    await expect(
      createGoal(
        "org_dg_imports",
        {
          displayMode: "absolute",
          metric: "profit",
          name: "Lucro abril",
          periodEnd: "2099-12-31",
          periodStart: "2099-01-01",
          targetValue: 5000,
        },
        "user-1"
      )
    ).rejects.toThrow("audit failed");

    expect(mockDb.transaction).toHaveBeenCalledOnce();
    expect(goalValues).toHaveBeenCalled();
    expect(auditValues).toHaveBeenCalled();
  });

  it("uses the paid capacity of three active goals before rejecting another one", async () => {
    const { createGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    entitlementMocks.getOrganizationPlanEntitlements.mockResolvedValueOnce({
      maxActiveGoals: 3,
      maxImagesPerProduct: 5,
      maxRegisteredProducts: 250,
    });
    mockDb.select.mockReturnValue({
      from: () => ({
        where: async () => [{ value: 3 }],
      }),
    });

    await expect(
      createGoal(
        "org_dg_imports",
        {
          displayMode: "absolute",
          metric: "profit",
          name: "Quarta meta",
          periodEnd: "2099-12-31",
          periodStart: "2099-01-01",
          targetValue: 5000,
        },
        "user-1"
      )
    ).rejects.toThrow("Voce pode ter no maximo 3 metas ativas.");

    expect(
      mockDb.execute.mock.calls.some((call) =>
        JSON.stringify(call[0]).includes("pg_advisory_xact_lock")
      )
    ).toBe(true);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("does not treat a lost active goal update race as success", async () => {
    const { updateGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(activeGoalRow);
    await mockLostGoalUpdate();

    await expect(
      updateGoal(
        "org_dg_imports",
        {
          displayMode: "absolute",
          id: activeGoalRow.id,
          metric: "profit",
          name: "Meta atualizada",
          periodEnd: "2099-12-31",
          periodStart: "2099-01-01",
          targetValue: 200,
        },
        "user-1"
      )
    ).rejects.toThrow("Meta nao encontrada ou nao esta ativa.");
  });

  it("does not treat a lost goal archive race as success", async () => {
    const { archiveGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(activeGoalRow);
    await mockLostGoalUpdate();

    await expect(
      archiveGoal("org_dg_imports", activeGoalRow.id, "user-1")
    ).rejects.toThrow("Meta nao encontrada.");
  });

  it("does not treat a lost goal unarchive race as success", async () => {
    const { unarchiveGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue(archivedGoalRow);
    await mockLostGoalUpdate();

    await expect(
      unarchiveGoal("org_dg_imports", archivedGoalRow.id, "user-1")
    ).rejects.toThrow("Meta nao encontrada.");
  });

  it("does not allow a terminal goal to be archived", async () => {
    const { archiveGoal } = await import("@/features/goals/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.goals.findFirst.mockResolvedValue({
      ...activeGoalRow,
      status: "completed",
    });

    await expect(
      archiveGoal("org_dg_imports", activeGoalRow.id, "user-1")
    ).rejects.toThrow("Somente metas ativas podem ser arquivadas.");
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
