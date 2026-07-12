import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/features/goals/server", () => ({
  archiveGoal: vi.fn(),
  createGoal: vi.fn(),
  unarchiveGoal: vi.fn(),
  updateGoal: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const auth = await import("@/lib/app-session");
  const goalsServer = await import("@/features/goals/server");
  const cache = await import("next/cache");

  return {
    mockArchiveGoal: goalsServer.archiveGoal as MockFn,
    mockCreateGoal: goalsServer.createGoal as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockRequireAppContext: auth.requireAppContext as MockFn,
    mockUnarchiveGoal: goalsServer.unarchiveGoal as MockFn,
    mockUpdateGoal: goalsServer.updateGoal as MockFn,
  };
};

describe("metas server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before creating a goal", async () => {
    const { mockRequireAppContext } = await resolveMocks();
    mockRequireAppContext.mockRejectedValue(new Error("Sessao invalida."));

    const { createGoalAction } = await import("@/features/goals/actions");

    await expect(
      createGoalAction({
        displayMode: "percentage",
        metric: "revenue",
        name: "X",
        periodEnd: "2025-06-30",
        periodStart: "2025-06-01",
        targetValue: 10,
      })
    ).rejects.toThrow("Sessao invalida.");
  });

  it("creates a goal with parsed payload and user id", async () => {
    const { mockCreateGoal, mockRefresh, mockRequireAppContext } =
      await resolveMocks();
    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockCreateGoal.mockResolvedValue(undefined);

    const { createGoalAction } = await import("@/features/goals/actions");

    await createGoalAction({
      displayMode: "absolute",
      metric: "profit",
      name: "Lucro abril",
      periodEnd: "2025-06-30",
      periodStart: "2025-06-01",
      targetValue: 5000,
    });

    expect(mockCreateGoal).toHaveBeenCalledWith(
      "org_dg_imports",
      {
        displayMode: "absolute",
        metric: "profit",
        name: "Lucro abril",
        periodEnd: "2025-06-30",
        periodStart: "2025-06-01",
        targetValue: 5000,
      },
      "user-1"
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("updates and archives goals after authentication", async () => {
    const {
      mockArchiveGoal,
      mockRefresh,
      mockRequireAppContext,
      mockUpdateGoal,
    } = await resolveMocks();
    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockUpdateGoal.mockResolvedValue(undefined);
    mockArchiveGoal.mockResolvedValue(undefined);

    const { archiveGoalAction, updateGoalAction } = await import(
      "@/features/goals/actions"
    );

    await updateGoalAction({
      displayMode: "percentage",
      id: "550e8400-e29b-41d4-a716-446655440000",
      metric: "revenue",
      name: "A",
      periodEnd: "2025-06-30",
      periodStart: "2025-06-01",
      targetValue: 100,
    });

    expect(mockUpdateGoal).toHaveBeenCalledWith(
      "org_dg_imports",
      {
        displayMode: "percentage",
        id: "550e8400-e29b-41d4-a716-446655440000",
        metric: "revenue",
        name: "A",
        periodEnd: "2025-06-30",
        periodStart: "2025-06-01",
        targetValue: 100,
      },
      "user-1"
    );

    await archiveGoalAction({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(mockArchiveGoal).toHaveBeenCalledWith(
      "org_dg_imports",
      "550e8400-e29b-41d4-a716-446655440000",
      "user-1"
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not refresh when goal update is rejected", async () => {
    const { mockRefresh, mockRequireAppContext, mockUpdateGoal } =
      await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockUpdateGoal.mockRejectedValue(
      new Error("Meta nao encontrada ou nao esta ativa.")
    );

    const { updateGoalAction } = await import("@/features/goals/actions");

    await expect(
      updateGoalAction({
        displayMode: "percentage",
        id: "550e8400-e29b-41d4-a716-446655440000",
        metric: "revenue",
        name: "A",
        periodEnd: "2025-06-30",
        periodStart: "2025-06-01",
        targetValue: 100,
      })
    ).rejects.toThrow("Meta nao encontrada ou nao esta ativa.");

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not refresh when goal archive is rejected", async () => {
    const { mockArchiveGoal, mockRefresh, mockRequireAppContext } =
      await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockArchiveGoal.mockRejectedValue(new Error("Meta nao encontrada."));

    const { archiveGoalAction } = await import("@/features/goals/actions");

    await expect(
      archiveGoalAction({
        id: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).rejects.toThrow("Meta nao encontrada.");

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("unarchives a goal after authentication", async () => {
    const { mockRefresh, mockRequireAppContext, mockUnarchiveGoal } =
      await resolveMocks();
    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockUnarchiveGoal.mockResolvedValue(undefined);

    const { unarchiveGoalAction } = await import("@/features/goals/actions");

    await unarchiveGoalAction({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(mockUnarchiveGoal).toHaveBeenCalledWith(
      "org_dg_imports",
      "550e8400-e29b-41d4-a716-446655440000",
      "user-1"
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not refresh when goal unarchive is rejected", async () => {
    const { mockRefresh, mockRequireAppContext, mockUnarchiveGoal } =
      await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockUnarchiveGoal.mockRejectedValue(new Error("Meta nao encontrada."));

    const { unarchiveGoalAction } = await import("@/features/goals/actions");

    await expect(
      unarchiveGoalAction({
        id: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).rejects.toThrow("Meta nao encontrada.");

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
