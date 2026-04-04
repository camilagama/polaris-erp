import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
}));

vi.mock("@/lib/server-action-auth", () => ({
  requireActionSession: vi.fn(),
}));

vi.mock("@/features/goals/server", () => ({
  archiveGoal: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const auth = await import("@/lib/server-action-auth");
  const goalsServer = await import("@/features/goals/server");
  const cache = await import("next/cache");

  return {
    mockArchiveGoal: goalsServer.archiveGoal as MockFn,
    mockCreateGoal: goalsServer.createGoal as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockRequireSession: auth.requireActionSession as MockFn,
    mockUpdateGoal: goalsServer.updateGoal as MockFn,
  };
};

describe("metas server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before creating a goal", async () => {
    const { mockRequireSession } = await resolveMocks();
    mockRequireSession.mockRejectedValue(new Error("Sessao invalida."));

    const { createGoalAction } = await import("@/app/(app)/metas/actions");

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
    const { mockCreateGoal, mockRefresh, mockRequireSession } =
      await resolveMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "user-1" } });
    mockCreateGoal.mockResolvedValue(undefined);

    const { createGoalAction } = await import("@/app/(app)/metas/actions");

    await createGoalAction({
      displayMode: "absolute",
      metric: "profit",
      name: "Lucro abril",
      periodEnd: "2025-06-30",
      periodStart: "2025-06-01",
      targetValue: 5000,
    });

    expect(mockCreateGoal).toHaveBeenCalledWith(
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
    const { mockArchiveGoal, mockRefresh, mockRequireSession, mockUpdateGoal } =
      await resolveMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdateGoal.mockResolvedValue(undefined);
    mockArchiveGoal.mockResolvedValue(undefined);

    const { archiveGoalAction, updateGoalAction } = await import(
      "@/app/(app)/metas/actions"
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

    expect(mockUpdateGoal).toHaveBeenCalled();

    await archiveGoalAction({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(mockArchiveGoal).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(mockRefresh).toHaveBeenCalled();
  });
});
