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
  stock: number;
}

interface SalesHarness {
  productById: Map<string, ProductState>;
  saleItemsLog: Record<string, unknown>[];
  salesLog: Record<string, unknown>[];
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
            unitPrice: 10,
          },
        ],
        occurredOn: "2026-03-31",
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
            unitPrice: 10,
          },
          {
            productId: "product-1",
            quantity: 1,
            unitPrice: 10,
          },
        ],
        occurredOn: "2026-03-31",
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
        stock: 5,
      },
    ]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    const results = await Promise.allSettled([
      createSaleAction({
        items: [
          {
            productId: "product-1",
            quantity: 3,
            unitPrice: 90,
          },
        ],
        occurredOn: "2026-03-31",
      }),
      createSaleAction({
        items: [
          {
            productId: "product-1",
            quantity: 3,
            unitPrice: 90,
          },
        ],
        occurredOn: "2026-03-31",
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
  });
});
