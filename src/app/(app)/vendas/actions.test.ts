import { beforeEach, describe, expect, it, vi } from "vitest";
import { products, saleItems, sales } from "@/db/schema";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
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

type MockFn = ReturnType<typeof vi.fn>;

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
  const dbModule = await import("@/db");

  return {
    mockDb: dbModule.db as unknown as {
      transaction: MockFn;
    },
    mockSession: sessionModule.getSession as MockFn,
  };
};

const createSalesHarness = (productsState: ProductState[]): SalesHarness => {
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
      insert: (table: unknown) => ({
        values: (
          payload: Record<string, unknown> | Record<string, unknown>[]
        ) => {
          if (table === sales) {
            salesLog.push(payload as Record<string, unknown>);

            return {
              returning: async () => [{ id: "sale-1" }],
            };
          }

          if (table === saleItems) {
            const rows = Array.isArray(payload) ? payload : [payload];
            saleItemsLog.push(...rows);
            return Promise.resolve([]);
          }

          throw new Error("Tabela de insert nao suportada no teste.");
        },
      }),
      update: (table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => {
            if (table !== products) {
              throw new Error("Tabela de update nao suportada no teste.");
            }

            for (const product of productById.values()) {
              if (
                typeof payload.stock === "number" &&
                payload.stock <= product.stock
              ) {
                product.stock = payload.stock;
                break;
              }
            }

            return Promise.resolve([]);
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
      update: (table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => {
            if (table === products) {
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

              product.stock = payload.stock;
              productUpdateCount += 1;
              return Promise.resolve([]);
            }

            if (table === sales) {
              state.saleStatus = payload.status as "cancelled" | "completed";
              state.cancelledAt =
                payload.cancelledAt instanceof Date
                  ? payload.cancelledAt
                  : null;
              return Promise.resolve([]);
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

    const { mockSession } = await resolveMocks();

    mockSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
  });

  it("requires authentication before creating a sale", async () => {
    const { createSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb, mockSession } = await resolveMocks();

    mockSession.mockResolvedValueOnce(null);

    await expect(
      createSaleAction({
        items: [
          {
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
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
            productId: "product-1",
            quantity: 1,
          },
          {
            productId: "product-1",
            quantity: 1,
          },
        ],
        occurredOn: "2026-03-31",
        paymentMethod: "pix",
      })
    ).rejects.toThrowError("Nao repita o mesmo produto na venda.");
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
            productId: "product-1",
            quantity: 3,
          },
        ],
        occurredOn: "2026-03-31",
        paymentMethod: "card",
      }),
      createSaleAction({
        items: [
          {
            productId: "product-1",
            quantity: 3,
          },
        ],
        occurredOn: "2026-03-31",
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
      discountAmount: "20.00",
      feeAmount: "0.00",
      freightAmount: "15.00",
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

    await createSaleAction({
      additionalAmount: 10,
      discountAmount: 0,
      items: [
        {
          productId: "product-1",
          quantity: 1,
        },
      ],
      occurredOn: "2026-03-31",
      paymentMethod: "pix",
    });

    const [createdSalePayload] = harness.salesLog;

    expect(createdSalePayload).toMatchObject({
      additionalAmount: "10.00",
      discountAmount: "0.00",
      feeAmount: "0.00",
      paymentFeePercent: "0.00",
      paymentInstallments: 0,
      paymentMethod: "pix",
      totalAmount: "100.00",
    });
  });

  it("stores card sales without fee and keeps the payment method for reporting", async () => {
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
          productId: "product-1",
          quantity: 2,
        },
      ],
      occurredOn: "2026-03-31",
      paymentMethod: "card",
    });

    const [createdSalePayload] = harness.salesLog;

    expect(createdSalePayload).toMatchObject({
      feeAmount: "0.00",
      paymentFeePercent: "0.00",
      paymentInstallments: 1,
      paymentMethod: "card",
      totalAmount: "200.00",
    });
  });

  it("cancels a sale and restores stock", async () => {
    const { cancelSaleAction } = await import("@/app/(app)/vendas/actions");
    const { mockDb } = await resolveMocks();

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
  });
});
