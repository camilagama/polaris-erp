import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      sales: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

const mockGetCatalogSettings = vi.fn();

vi.mock("@/features/catalog/server", () => ({
  getCatalogSettings: mockGetCatalogSettings,
}));

type MockFn = ReturnType<typeof vi.fn>;
const STALE_PRICE_ERROR_REGEX =
  /Preco do produto Produto 1 foi atualizado para R\$[\s\u00A0]?100,00\. Revise a venda e tente novamente\./;

interface ProductState {
  archivedAt: Date | null;
  costPrice: number;
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface SalesHarness {
  productById: Map<string, ProductState>;
  saleItemsLog: Record<string, unknown>[];
  salesLog: Record<string, unknown>[];
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
}

interface CancelSaleHarness {
  productById: Map<string, ProductState>;
  state: {
    cancelledAt: Date | null;
    saleStatus: "cancelled" | "completed";
  };
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
}

const resolveMocks = async () => {
  const sessionModule = await import("@/lib/session");
  const appSessionModule = await import("@/lib/app-session");
  const auditLogModule = await import("@/lib/audit-log");
  const dbModule = await import("@/db");
  const cache = await import("next/cache");

  return {
    mockCatalogSettings: mockGetCatalogSettings as MockFn,
    mockDb: dbModule.db as unknown as {
      query: {
        sales: {
          findFirst: MockFn;
        };
      };
      transaction: MockFn;
    },
    mockRecordAuditEvent: auditLogModule.recordAuditEvent as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockRequireAppContext: appSessionModule.requireAppContext as MockFn,
    mockSession: sessionModule.getSession as MockFn,
    mockUpdateTag: cache.updateTag as MockFn,
  };
};

const createSalesHarness = (
  productsState: ProductState[],
  options: { loseStockUpdate?: boolean } = {}
): SalesHarness => {
  const productById = new Map(
    productsState.map((product) => [product.id, { ...product }])
  );
  const salesLog: Record<string, unknown>[] = [];
  const saleItemsLog: Record<string, unknown>[] = [];
  let queue = Promise.resolve();

  const transaction = async <T>(callback: (tx: unknown) => Promise<T>) => {
    const previous = queue;
    let release: (() => void) | undefined;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    const tx = {
      execute: () => {
        const rows = [...productById.values()]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((product) => ({
            archivedAt: product.archivedAt,
            costPrice: product.costPrice.toFixed(2),
            id: product.id,
            name: product.name,
            price: product.price.toFixed(2),
            stock: product.stock,
          }));

        return { rows };
      },
      insert: (_table: unknown) => ({
        values: (
          payload: Record<string, unknown> | Record<string, unknown>[]
        ) => {
          if (!Array.isArray(payload) && "paymentMethod" in payload) {
            salesLog.push(payload as Record<string, unknown>);

            return {
              returning: async () => [{ id: "sale-1" }],
            };
          }

          if (
            (Array.isArray(payload) &&
              payload.every((row) => "saleId" in row)) ||
            (!Array.isArray(payload) && "saleId" in payload)
          ) {
            const rows = Array.isArray(payload) ? payload : [payload];
            saleItemsLog.push(...rows);
            return Promise.resolve([]);
          }

          throw new Error("Tabela de insert nao suportada no teste.");
        },
      }),
      update: (_table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => {
            if (!("stock" in payload)) {
              throw new Error("Tabela de update nao suportada no teste.");
            }

            return {
              returning: () => {
                if (options.loseStockUpdate) {
                  return [];
                }

                for (const product of productById.values()) {
                  if (
                    typeof payload.stock === "number" &&
                    payload.stock <= product.stock
                  ) {
                    product.stock = payload.stock;
                    return [{ id: product.id }];
                  }
                }

                return [];
              },
            };
          },
        }),
      }),
    };

    try {
      return await callback(tx);
    } finally {
      release?.();
    }
  };

  return {
    productById,
    saleItemsLog,
    salesLog,
    transaction,
  };
};

const createCancelSaleHarness = (params: {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  loseSaleStatusUpdate?: boolean;
  loseStockUpdate?: boolean;
  productsState: ProductState[];
  saleStatus?: "cancelled" | "completed";
}): CancelSaleHarness => {
  const productById = new Map(
    params.productsState.map((product) => [product.id, { ...product }])
  );
  const state = {
    cancelledAt: null as Date | null,
    saleStatus: params.saleStatus ?? "completed",
  };
  let executeCallCount = 0;
  let productUpdateCount = 0;

  const transaction = async <T>(callback: (tx: unknown) => Promise<T>) => {
    const tx = {
      execute: () => {
        executeCallCount += 1;

        if (executeCallCount === 1) {
          return Promise.resolve({
            rows: [
              {
                id: "sale-1",
                status: state.saleStatus,
              },
            ],
          });
        }

        return Promise.resolve({
          rows: [...productById.values()]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((product) => ({
              archivedAt: product.archivedAt,
              costPrice: product.costPrice.toFixed(2),
              id: product.id,
              name: product.name,
              price: product.price.toFixed(2),
              stock: product.stock,
            })),
        });
      },
      select: () => ({
        from: () => ({
          where: async () =>
            params.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
        }),
      }),
      update: (_table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => {
            if ("stock" in payload) {
              const productId = params.items[productUpdateCount]?.productId;

              if (!productId) {
                throw new Error(
                  "Produto nao encontrado no teste de cancelamento."
                );
              }

              const product = productById.get(productId);

              if (!product) {
                throw new Error("Estado de produto nao encontrado no teste.");
              }

              if (typeof payload.stock !== "number") {
                throw new Error("Cancelamento deve atualizar o estoque.");
              }

              return {
                returning: () => {
                  productUpdateCount += 1;

                  if (params.loseStockUpdate) {
                    return [];
                  }

                  product.stock = payload.stock;
                  return [{ id: product.id }];
                },
              };
            }

            if ("status" in payload || "cancelledAt" in payload) {
              return {
                returning: () => {
                  if (params.loseSaleStatusUpdate) {
                    return [];
                  }

                  state.saleStatus = payload.status as
                    | "cancelled"
                    | "completed";
                  state.cancelledAt =
                    payload.cancelledAt instanceof Date
                      ? payload.cancelledAt
                      : null;
                  return [{ id: "sale-1" }];
                },
              };
            }

            throw new Error("Tabela de update nao suportada no teste.");
          },
        }),
      }),
    };

    return await callback(tx);
  };

  return {
    productById,
    state,
    transaction,
  };
};

describe("sales server actions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockCatalogSettings, mockRequireAppContext, mockSession } =
      await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "owner",
      userId: "user-1",
    });

    mockSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    mockCatalogSettings.mockResolvedValue({
      cardInstallmentRules: [
        { feePercent: 0, installments: 1 },
        { feePercent: 1.5, installments: 2 },
        { feePercent: 3, installments: 3 },
      ],
      idealMarkupPercent: 0,
      minimumMarkupPercent: 0,
    });
  });

  it("requires authentication before creating a sale", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRequireAppContext } = await resolveMocks();

    mockRequireAppContext.mockRejectedValueOnce(
      new Error("Sessao invalida. Faca login novamente.")
    );

    await expect(
      createSaleAction({
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).rejects.toThrowError("Sessao invalida. Faca login novamente.");

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicated products in the same sale payload", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");

    await expect(
      createSaleAction({
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).rejects.toThrowError("Nao repita o mesmo produto na venda.");
  });

  it("returns the existing sale for a repeated idempotency key", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockUpdateTag } = await resolveMocks();

    mockDb.query.sales.findFirst.mockResolvedValueOnce({
      id: "sale-existing",
    });

    await expect(
      createSaleAction({
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).resolves.toBe("sale-existing");

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns the existing sale when a concurrent idempotency insert wins first", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRecordAuditEvent, mockRefresh, mockUpdateTag } =
      await resolveMocks();

    mockDb.query.sales.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "sale-existing" });
    mockDb.transaction.mockRejectedValueOnce(
      Object.assign(
        new Error("duplicate key value violates unique constraint"),
        {
          code: "23505",
          constraint: "sales_organization_idempotency_key_unique_idx",
        }
      )
    );

    await expect(
      createSaleAction({
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).resolves.toBe("sale-existing");

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });

  it("serializes concurrent sales and blocks negative stock", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb } = await resolveMocks();

    const harness = createSalesHarness([
      {
        archivedAt: null,
        costPrice: 50,
        id: "product-1",
        name: "Produto 1",
        price: 90,
        stock: 5,
      },
    ]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    const results = await Promise.allSettled([
      createSaleAction({
        additionalAmount: 10,
        discountAmount: 20,
        freightAmount: 15,
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 3,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "seller",
        paymentInstallments: 1,
        paymentMethod: "card",
      }),
      createSaleAction({
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 3,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;

    expect(rejectionReason).toBeInstanceOf(Error);
    expect(rejectionReason.message).toContain("Estoque insuficiente");

    expect(harness.productById.get("product-1")?.stock).toBe(2);
    expect(harness.salesLog).toHaveLength(1);
    expect(harness.saleItemsLog).toHaveLength(1);

    const [createdSalePayload] = harness.salesLog;
    const [createdSaleItemPayload] = harness.saleItemsLog;

    expect(createdSalePayload).toMatchObject({
      additionalAmount: "10.00",
      chargedAmount: "275.00",
      discountAmount: "20.00",
      feeAmount: "0.00",
      freightAmount: "15.00",
      paymentFeePayer: "seller",
      paymentFeePercent: "0.00",
      paymentInstallments: 1,
      paymentMethod: "card",
      totalAmount: "275.00",
    });

    expect(createdSaleItemPayload).toMatchObject({
      lineTotal: "270.00",
      unitPriceSnapshot: "90.00",
    });
  });

  it("stores pix sales without fee and keeps total based on items only", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    const harness = createSalesHarness([
      {
        archivedAt: null,
        costPrice: 50,
        id: "product-1",
        name: "Produto 1",
        price: 90,
        stock: 5,
      },
    ]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await createSaleAction({
      additionalAmount: 10,
      discountAmount: 0,
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      items: [
        {
          expectedUnitPrice: 90,
          productId: "product-1",
          quantity: 1,
        },
      ],
      occurredOn: "2026-03-31",
      paymentFeePayer: "not_applicable",
      paymentInstallments: 0,
      paymentMethod: "pix",
    });

    const [createdSalePayload] = harness.salesLog;

    expect(createdSalePayload).toMatchObject({
      additionalAmount: "10.00",
      chargedAmount: "100.00",
      discountAmount: "0.00",
      feeAmount: "0.00",
      paymentFeePayer: "not_applicable",
      paymentFeePercent: "0.00",
      paymentInstallments: 0,
      paymentMethod: "pix",
      totalAmount: "100.00",
    });
    expect(createdSalePayload?.idempotencyKey).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("stores card sales with seller fee as operational cost", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb } = await resolveMocks();

    const harness = createSalesHarness([
      {
        archivedAt: null,
        costPrice: 30,
        id: "product-1",
        name: "Produto 1",
        price: 100,
        stock: 10,
      },
    ]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await createSaleAction({
      additionalAmount: 0,
      discountAmount: 0,
      freightAmount: 0,
      items: [
        {
          expectedUnitPrice: 100,
          productId: "product-1",
          quantity: 2,
        },
      ],
      occurredOn: "2026-03-31",
      paymentFeePayer: "seller",
      paymentInstallments: 3,
      paymentMethod: "card",
    });

    const [createdSalePayload] = harness.salesLog;

    expect(createdSalePayload).toMatchObject({
      chargedAmount: "200.00",
      feeAmount: "6.00",
      paymentFeePayer: "seller",
      paymentFeePercent: "3.00",
      paymentInstallments: 3,
      paymentMethod: "card",
      totalAmount: "200.00",
    });
  });

  it("stores card sales with customer fee only in charged amount", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb } = await resolveMocks();

    const harness = createSalesHarness([
      {
        archivedAt: null,
        costPrice: 30,
        id: "product-1",
        name: "Produto 1",
        price: 100,
        stock: 10,
      },
    ]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await createSaleAction({
      additionalAmount: 0,
      discountAmount: 0,
      freightAmount: 0,
      items: [
        {
          expectedUnitPrice: 100,
          productId: "product-1",
          quantity: 2,
        },
      ],
      occurredOn: "2026-03-31",
      paymentFeePayer: "customer",
      paymentInstallments: 3,
      paymentMethod: "card",
    });

    const [createdSalePayload] = harness.salesLog;

    expect(createdSalePayload).toMatchObject({
      chargedAmount: "206.00",
      feeAmount: "0.00",
      paymentFeePayer: "customer",
      paymentFeePercent: "0.00",
      paymentInstallments: 3,
      paymentMethod: "card",
      totalAmount: "200.00",
    });
  });

  it("rejects the sale when the visible price is stale and asks for review", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb } = await resolveMocks();

    const harness = createSalesHarness([
      {
        archivedAt: null,
        costPrice: 30,
        id: "product-1",
        name: "Produto 1",
        price: 100,
        stock: 10,
      },
    ]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(
      createSaleAction({
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).rejects.toThrowError(STALE_PRICE_ERROR_REGEX);

    expect(harness.salesLog).toEqual([]);
    expect(harness.saleItemsLog).toEqual([]);
    expect(harness.productById.get("product-1")?.stock).toBe(10);
  });

  it("does not audit or revalidate when sale stock update is lost", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRecordAuditEvent, mockRefresh, mockUpdateTag } =
      await resolveMocks();

    const harness = createSalesHarness(
      [
        {
          archivedAt: null,
          costPrice: 50,
          id: "product-1",
          name: "Produto 1",
          price: 90,
          stock: 5,
        },
      ],
      { loseStockUpdate: true }
    );

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(
      createSaleAction({
        items: [
          {
            expectedUnitPrice: 90,
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).rejects.toThrow("Produto nao encontrado.");

    expect(harness.productById.get("product-1")?.stock).toBe(5);
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });

  it("cancels a sale and restores stock", async () => {
    const { cancelSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    const harness = createCancelSaleHarness({
      items: [
        {
          productId: "product-1",
          quantity: 2,
        },
      ],
      productsState: [
        {
          archivedAt: null,
          costPrice: 50,
          id: "product-1",
          name: "Produto 1",
          price: 90,
          stock: 3,
        },
      ],
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await cancelSaleAction("sale-1");

    expect(harness.productById.get("product-1")?.stock).toBe(5);
    expect(harness.state.saleStatus).toBe("cancelled");
    expect(harness.state.cancelledAt).toBeInstanceOf(Date);
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not audit or revalidate when cancellation stock restore is lost", async () => {
    const { cancelSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRecordAuditEvent, mockRefresh, mockUpdateTag } =
      await resolveMocks();

    const harness = createCancelSaleHarness({
      items: [
        {
          productId: "product-1",
          quantity: 2,
        },
      ],
      loseStockUpdate: true,
      productsState: [
        {
          archivedAt: null,
          costPrice: 50,
          id: "product-1",
          name: "Produto 1",
          price: 90,
          stock: 3,
        },
      ],
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(cancelSaleAction("sale-1")).rejects.toThrow(
      "Produto nao encontrado para estorno."
    );

    expect(harness.productById.get("product-1")?.stock).toBe(3);
    expect(harness.state.saleStatus).toBe("completed");
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });

  it("does not audit or revalidate when the final sale cancellation update is lost", async () => {
    const { cancelSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockRecordAuditEvent, mockRefresh, mockUpdateTag } =
      await resolveMocks();

    const harness = createCancelSaleHarness({
      items: [
        {
          productId: "product-1",
          quantity: 2,
        },
      ],
      loseSaleStatusUpdate: true,
      productsState: [
        {
          archivedAt: null,
          costPrice: 50,
          id: "product-1",
          name: "Produto 1",
          price: 90,
          stock: 3,
        },
      ],
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(cancelSaleAction("sale-1")).rejects.toThrow(
      "Venda nao encontrada."
    );

    expect(harness.state.saleStatus).toBe("completed");
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });
});
