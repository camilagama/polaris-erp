import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createFunctionMock, reconcileProductImagesMock } = vi.hoisted(() => ({
  createFunctionMock: vi.fn((options, handler) => ({
    handler,
    options,
    trigger: options.triggers,
  })),
  reconcileProductImagesMock: vi.fn(),
}));

vi.mock("@/features/products/image-reconcile", () => ({
  reconcileProductImages: reconcileProductImagesMock,
}));

vi.mock("@/lib/inngest-client", () => ({
  inngest: {
    createFunction: createFunctionMock,
  },
}));

describe("product image reconcile Inngest function", () => {
  afterEach(() => {
    createFunctionMock.mockClear();
    reconcileProductImagesMock.mockReset();
    vi.resetModules();
  });

  it("registers a daily scheduled reconcile function", async () => {
    const { productImageInngestFunctions } = await import(
      "@/features/products/image-reconcile-inngest"
    );

    expect(productImageInngestFunctions).toHaveLength(1);
    expect(createFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concurrency: { limit: 2 },
        id: "reconcile-product-images",
        retries: 3,
        triggers: { cron: "0 4 * * *" },
      }),
      expect.any(Function)
    );
  });
});
