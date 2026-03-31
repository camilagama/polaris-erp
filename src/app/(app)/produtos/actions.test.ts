import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  productStockEntries,
  productStockWriteOffs,
  products,
} from "@/db/schema";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/catalog/server", () => ({
  getProductCategoryById: vi.fn(),
}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  },
}));

const ISO_DATE_ERROR_REGEX = /ISO YYYY-MM-DD/;

interface InventoryHarness {
  entryLog: Record<string, unknown>[];
  state: {
    costPrice: number;
    stock: number;
  };
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
  writeOffLog: Record<string, unknown>[];
}

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const sessionModule = await import("@/lib/session");
  const catalogModule = await import("@/features/catalog/server");
  const dbModule = await import("@/db");

  return {
    mockDb: dbModule.db as unknown as {
      transaction: MockFn;
    },
    mockGetProductCategoryById: catalogModule.getProductCategoryById as MockFn,
    mockSession: sessionModule.getSession as MockFn,
  };
};

const createInventoryHarness = (initialState: {
  costPrice: number;
  stock: number;
}): InventoryHarness => {
  const state = { ...initialState };
  const entryLog: Record<string, unknown>[] = [];
  const writeOffLog: Record<string, unknown>[] = [];
  let queue = Promise.resolve();

  const transaction = async <T>(callback: (tx: unknown) => Promise<T>) => {
    const previous = queue;
    let release: (() => void) | undefined;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    const tx = {
      execute: async () => ({
        rows: [
          {
            archivedAt: null,
            costPrice: state.costPrice.toFixed(2),
            id: "product-1",
            stock: state.stock,
          },
        ],
      }),
      insert: (table: unknown) => ({
        values: (payload: Record<string, unknown>) => {
          if (table === productStockEntries) {
            entryLog.push(payload);
            return Promise.resolve([]);
          }

          if (table === productStockWriteOffs) {
            writeOffLog.push(payload);
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

            if (typeof payload.stock === "number") {
              state.stock = payload.stock;
            }

            if (typeof payload.costPrice === "string") {
              state.costPrice = Number(payload.costPrice);
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
    entryLog,
    state,
    transaction,
    writeOffLog,
  };
};

describe("product server actions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockGetProductCategoryById, mockSession } = await resolveMocks();

    mockSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    mockGetProductCategoryById.mockResolvedValue({
      id: "category-1",
    });
  });

  it("requires authentication before mutating stock", async () => {
    const { addProductStockAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb, mockSession } = await resolveMocks();

    mockSession.mockResolvedValueOnce(null);

    await expect(
      addProductStockAction("product-1", {
        quantity: 1,
        stockedOn: "2026-03-31",
        unitCost: "10.00",
      })
    ).rejects.toThrowError("Sessao invalida. Faca login novamente.");

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("validates ISO date format at action boundary", async () => {
    const { createProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb, mockGetProductCategoryById } = await resolveMocks();

    await expect(
      createProductAction({
        categoryId: "category-1",
        costPrice: "10",
        name: "Produto teste",
        price: "20",
        purchasedOn: "31/03/2026",
        stock: 1,
      })
    ).rejects.toThrowError(ISO_DATE_ERROR_REGEX);

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockGetProductCategoryById).not.toHaveBeenCalled();
  });

  it("serializes concurrent stock write-offs and blocks negative stock", async () => {
    const { writeOffProductStockAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();

    const harness = createInventoryHarness({
      costPrice: 10,
      stock: 5,
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    const results = await Promise.allSettled([
      writeOffProductStockAction("product-1", {
        happenedOn: "2026-03-31",
        notes: "primeira baixa",
        quantity: 3,
        reason: "operational",
      }),
      writeOffProductStockAction("product-1", {
        happenedOn: "2026-03-31",
        notes: "segunda baixa",
        quantity: 3,
        reason: "operational",
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;

    expect(rejectionReason).toBeInstanceOf(Error);
    expect(rejectionReason.message).toContain(
      "A baixa nao pode ser maior que o estoque atual."
    );

    expect(harness.state.stock).toBe(2);
    expect(harness.writeOffLog).toHaveLength(1);
  });
});
