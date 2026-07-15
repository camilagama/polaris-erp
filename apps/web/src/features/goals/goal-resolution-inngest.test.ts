import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createFunctionMock, resolveActiveGoalsMock } = vi.hoisted(() => ({
  createFunctionMock: vi.fn((options, handler) => ({
    handler,
    options,
  })),
  resolveActiveGoalsMock: vi.fn(),
}));

vi.mock("@/features/goals/goal-resolution", () => ({
  resolveActiveGoals: resolveActiveGoalsMock,
}));

vi.mock("@/lib/inngest-client", () => ({
  inngest: {
    createFunction: createFunctionMock,
  },
}));

describe("goal resolution Inngest function", () => {
  afterEach(() => {
    createFunctionMock.mockClear();
    resolveActiveGoalsMock.mockReset();
    vi.resetModules();
  });

  it("serializes the hourly Sao Paulo-aware goal resolver", async () => {
    const { goalResolutionInngestFunctions } = await import(
      "@/features/goals/goal-resolution-inngest"
    );

    expect(goalResolutionInngestFunctions).toHaveLength(1);
    expect(createFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concurrency: { limit: 1 },
        id: "resolve-active-goals",
        retries: 3,
        triggers: [{ cron: "5 * * * *" }],
      }),
      expect.any(Function)
    );
  });
});
