import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockWithTenantContext = vi.hoisted(() => vi.fn());
const mockGetOrganizationPlanEntitlements = vi.hoisted(() => vi.fn());
const mockReserveCommandExecution = vi.hoisted(() => vi.fn());

vi.mock("@polaris/db/tenant-context", () => ({
  withTenantContext: mockWithTenantContext,
}));

vi.mock("@/lib/entitlements", () => ({
  getOrganizationPlanEntitlements: mockGetOrganizationPlanEntitlements,
}));

vi.mock("@polaris/events", () => ({
  completeCommandExecution: vi.fn(),
  reserveCommandExecution: mockReserveCommandExecution,
}));

const createProductInput = {
  actorUserId: "user-1",
  categoryId: "category-from-other-tenant",
  costPrice: "10.00",
  description: null,
  image: null,
  name: "Produto teste",
  organizationId: "org_dg_imports",
  price: "20.00",
  productId: "product-1",
  purchasedOn: "2026-03-31",
  stock: 1,
};

const updateProductInput = {
  actorUserId: "user-1",
  categoryId: "category-from-other-tenant",
  description: null,
  name: "Produto teste",
  organizationId: "org_dg_imports",
  price: "20.00",
  productId: "product-1",
};

describe("product server category validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrganizationPlanEntitlements.mockResolvedValue({
      maxActiveGoals: 1,
      maxImagesPerProduct: 1,
      maxRegisteredProducts: 50,
    });
  });

  it("builds the recent analytics window as civil business dates", async () => {
    const { getRecentPerformanceDateRange } = await import(
      "@/features/products/server"
    );

    expect(getRecentPerformanceDateRange("2026-01-01")).toEqual({
      from: "2025-12-03",
      to: "2026-01-01",
    });
  });

  it("returns the persisted stock result without writing again on replay", async () => {
    const { addProductStock } = await import("@/features/products/server");
    const tx = { execute: vi.fn() };

    mockReserveCommandExecution.mockResolvedValue({
      commandId: "command-1",
      kind: "replay",
      result: { productId: "product-1" },
      status: "succeeded",
    });
    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      addProductStock({
        actorUserId: "user-1",
        idempotencyKey: "command-key-1",
        organizationId: "org_dg_imports",
        productId: "product-1",
        quantity: 2,
        stockedOn: "2026-03-31",
        unitCost: 10,
      })
    ).resolves.toEqual({ productId: "product-1" });

    expect(tx.execute).not.toHaveBeenCalled();
  });

  it("does not mask a failed stock command replay as success", async () => {
    const { writeOffProductStock } = await import("@/features/products/server");
    const tx = { execute: vi.fn() };

    mockReserveCommandExecution.mockResolvedValue({
      commandId: "command-1",
      kind: "replay",
      result: {},
      status: "failed",
    });
    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      writeOffProductStock({
        actorUserId: "user-1",
        happenedOn: "2026-03-31",
        idempotencyKey: "command-key-1",
        notes: null,
        organizationId: "org_dg_imports",
        productId: "product-1",
        quantity: 2,
        reason: "operational",
      })
    ).rejects.toThrow("A operacao de estoque anterior falhou.");

    expect(tx.execute).not.toHaveBeenCalled();
  });

  it("rejects product creation when the category is missing in the tenant transaction", async () => {
    const { createProductWithInitialStock } = await import(
      "@/features/products/server"
    );
    const tx = {
      insert: vi.fn(),
      query: {
        categories: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };

    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      createProductWithInitialStock(createProductInput)
    ).rejects.toThrow("Selecione uma categoria valida.");

    expect(tx.query.categories.findFirst).toHaveBeenCalledOnce();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("rejects product updates when the category is missing in the tenant transaction", async () => {
    const { updateProductWithPriceHistory } = await import(
      "@/features/products/server"
    );
    const tx = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            costPrice: "10.00",
            id: "product-1",
            price: "20.00",
            stock: 1,
          },
        ],
      }),
      insert: vi.fn(),
      query: {
        categories: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      update: vi.fn(),
    };

    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      updateProductWithPriceHistory(updateProductInput)
    ).rejects.toThrow("Selecione uma categoria valida.");

    expect(tx.execute).toHaveBeenCalledOnce();
    expect(tx.query.categories.findFirst).toHaveBeenCalledOnce();
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("counts archived products and rejects creation at the tenant plan limit", async () => {
    const { createProductWithInitialStock } = await import(
      "@/features/products/server"
    );
    const tx = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
      insert: vi.fn(),
      query: {
        categories: {
          findFirst: vi.fn().mockResolvedValue({ id: "category-1" }),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ value: 50 }]),
        })),
      })),
    };

    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      createProductWithInitialStock({
        ...createProductInput,
        categoryId: "category-1",
      })
    ).rejects.toThrow("Limite de 50 produtos cadastrados atingido.");

    expect(tx.execute).toHaveBeenCalledOnce();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("soft deletes a zero-stock product and records the final removal audit", async () => {
    const { softDeleteProduct } = await import("@/features/products/server");
    const values = vi.fn().mockResolvedValue(undefined);
    const returning = vi.fn().mockResolvedValue([{ id: "product-1" }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const tx = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            costPrice: "10.00",
            id: "product-1",
            price: "20.00",
            softDeletedAt: null,
            stock: 0,
          },
        ],
      }),
      insert: vi.fn().mockReturnValue({ values }),
      update: vi.fn().mockReturnValue({ set }),
    };

    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      softDeleteProduct({
        actorUserId: "user-1",
        organizationId: "org_dg_imports",
        productId: "product-1",
        reason: "Item descontinuado sem saldo.",
      })
    ).resolves.toBe("deleted");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        imageBlurDataUrl: null,
        imageHeight: null,
        imageUploadedAt: null,
        imageVersion: null,
        imageWidth: null,
        softDeleteReason: "Item descontinuado sem saldo.",
        softDeletedByUserId: "user-1",
      })
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ type: "product.soft_deleted" })
    );
  });

  it("rejects final removal while the product still has stock", async () => {
    const { softDeleteProduct } = await import("@/features/products/server");
    const tx = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            costPrice: "10.00",
            id: "product-1",
            price: "20.00",
            softDeletedAt: null,
            stock: 1,
          },
        ],
      }),
      insert: vi.fn(),
      update: vi.fn(),
    };

    mockWithTenantContext.mockImplementationOnce(
      async (_organizationId: string, callback: (tx: unknown) => unknown) =>
        callback(tx)
    );

    await expect(
      softDeleteProduct({
        actorUserId: "user-1",
        organizationId: "org_dg_imports",
        productId: "product-1",
        reason: "Item descontinuado sem saldo.",
      })
    ).rejects.toThrow("Produto precisa ter estoque zero para remocao final.");

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
