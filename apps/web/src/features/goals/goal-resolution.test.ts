import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getDashboardMetricsMock, withInternalJobContextMock } = vi.hoisted(
  () => ({
    getDashboardMetricsMock: vi.fn(),
    withInternalJobContextMock: vi.fn(),
  })
);

vi.mock("@/features/dashboard/server", () => ({
  getDashboardMetrics: getDashboardMetricsMock,
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withInternalJobContext: withInternalJobContextMock,
}));

const activeGoal = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  metric: "revenue",
  organizationId: "org_dg_imports",
  periodEnd: "2025-12-30",
  periodStart: "2025-12-01",
  status: "active",
  targetValue: "100.00",
};

const createTransaction = ({
  activeGoals,
  resolvedGoals,
}: {
  activeGoals: (typeof activeGoal)[];
  resolvedGoals: (typeof activeGoal)[];
}) => {
  const auditValues = vi.fn().mockResolvedValue(undefined);

  return {
    auditValues,
    transaction: {
      insert: vi.fn(() => ({ values: auditValues })),
      select: vi.fn(() => ({
        from: () => ({
          where: async () => activeGoals,
        }),
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            returning: async () => resolvedGoals,
          }),
        }),
      })),
    },
  };
};

describe("resolveActiveGoals", () => {
  afterEach(() => {
    getDashboardMetricsMock.mockReset();
    withInternalJobContextMock.mockReset();
    vi.resetModules();
  });

  it("resolves a target with a conditional active transition and audit", async () => {
    const { auditValues, transaction } = createTransaction({
      activeGoals: [activeGoal],
      resolvedGoals: [activeGoal],
    });
    getDashboardMetricsMock.mockResolvedValue({
      totalResult: 0,
      totalSalesCount: 0,
      totalSold: 100,
    });
    withInternalJobContextMock.mockImplementation(async (_job, callback) =>
      callback(transaction)
    );

    const { resolveActiveGoals } = await import(
      "@/features/goals/goal-resolution"
    );

    await expect(
      resolveActiveGoals(new Date("2025-12-30T15:00:00.000Z"))
    ).resolves.toEqual({ completed: 1, conflicted: 0, expired: 0 });

    expect(withInternalJobContextMock).toHaveBeenCalledWith(
      "goal_resolution",
      expect.any(Function)
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: activeGoal.organizationId,
        subjectId: activeGoal.id,
        type: "goal.completed",
      })
    );
  });

  it("does not audit or overwrite a goal already changed by another actor", async () => {
    const { auditValues, transaction } = createTransaction({
      activeGoals: [activeGoal],
      resolvedGoals: [],
    });
    getDashboardMetricsMock.mockResolvedValue({
      totalResult: 0,
      totalSalesCount: 0,
      totalSold: 100,
    });
    withInternalJobContextMock.mockImplementation(async (_job, callback) =>
      callback(transaction)
    );

    const { resolveActiveGoals } = await import(
      "@/features/goals/goal-resolution"
    );

    await expect(
      resolveActiveGoals(new Date("2025-12-30T15:00:00.000Z"))
    ).resolves.toEqual({ completed: 0, conflicted: 1, expired: 0 });

    expect(auditValues).not.toHaveBeenCalled();
  });

  it("expires by the Sao Paulo business date", async () => {
    const { auditValues, transaction } = createTransaction({
      activeGoals: [activeGoal],
      resolvedGoals: [activeGoal],
    });
    getDashboardMetricsMock.mockResolvedValue({
      totalResult: 0,
      totalSalesCount: 0,
      totalSold: 0,
    });
    withInternalJobContextMock.mockImplementation(async (_job, callback) =>
      callback(transaction)
    );

    const { resolveActiveGoals } = await import(
      "@/features/goals/goal-resolution"
    );

    await expect(
      resolveActiveGoals(new Date("2026-01-01T02:30:00.000Z"))
    ).resolves.toEqual({ completed: 0, conflicted: 0, expired: 1 });

    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal.expired" })
    );
  });
});
