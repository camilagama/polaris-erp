import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockWithTenantContext = vi.hoisted(() => vi.fn());

vi.mock("@polaris/db/tenant-context", () => ({
  withTenantContext: mockWithTenantContext,
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
});
