import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  productStockEntries,
  productStockWriteOffs,
  products,
  sales,
} from "@/db/schema";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/catalog/server", () => ({
  getProductCategoryById: vi.fn(),
}));

vi.mock("@/features/products/image-storage", () => ({
  deleteProductImageVersion: vi.fn(),
}));

vi.mock("@/features/products/image-workflow", () => ({
  storeProductImageFromStage: vi.fn(),
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

interface ProductDeletionHarness {
  deletedSales: string[];
  productName: string;
  state: {
    deletedProduct: boolean;
  };
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
}

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const sessionModule = await import("@/lib/session");
  const catalogModule = await import("@/features/catalog/server");
  const dbModule = await import("@/db");
  const imageStorageModule = await import("@/features/products/image-storage");
  const imageWorkflowModule = await import(
    "@/features/products/image-workflow"
  );

  return {
    mockDeleteProductImageVersion:
      imageStorageModule.deleteProductImageVersion as MockFn,
    mockDb: dbModule.db as unknown as {
      select: MockFn;
      transaction: MockFn;
      update: MockFn;
    },
    mockGetProductCategoryById: catalogModule.getProductCategoryById as MockFn,
    mockSession: sessionModule.getSession as MockFn,
    mockStoreProductImageFromStage:
      imageWorkflowModule.storeProductImageFromStage as MockFn,
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

const createProductDeletionHarness = (
  linkedSaleIds: string[],
  productName = "Produto de teste"
): ProductDeletionHarness => {
  const deletedSales: string[] = [];
  const state = {
    deletedProduct: false,
  };

  const transaction = async <T>(callback: (tx: unknown) => Promise<T>) => {
    const tx = {
      delete: (table: unknown) => ({
        where: (_whereExpression: unknown) => {
          if (table === sales) {
            deletedSales.push(...linkedSaleIds);
            return Promise.resolve([]);
          }

          if (table === products) {
            state.deletedProduct = true;
            return Promise.resolve([]);
          }

          throw new Error("Tabela de delete nao suportada no teste.");
        },
      }),
      select: () => ({
        from: () => ({
          where: async () => [
            {
              name: productName,
            },
          ],
        }),
      }),
      selectDistinct: () => ({
        from: () => ({
          where: async () =>
            linkedSaleIds.map((saleId) => ({
              saleId,
            })),
        }),
      }),
    };

    return await callback(tx);
  };

  return {
    deletedSales,
    productName,
    state,
    transaction,
  };
};

describe("product server actions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const {
      mockDeleteProductImageVersion,
      mockGetProductCategoryById,
      mockSession,
      mockStoreProductImageFromStage,
    } = await resolveMocks();

    mockSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    mockGetProductCategoryById.mockResolvedValue({
      id: "category-1",
    });

    mockDeleteProductImageVersion.mockResolvedValue(undefined);
    mockStoreProductImageFromStage.mockResolvedValue({
      blurDataURL: "data:image/webp;base64,abc",
      height: 900,
      version: 1,
      width: 1200,
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

  it("creates a product with processed image metadata when a staged image is provided", async () => {
    const { createProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb, mockStoreProductImageFromStage } = await resolveMocks();
    const insertLog: Record<string, unknown>[] = [];

    mockDb.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<void>) => {
        await callback({
          insert: (table: unknown) => ({
            values: (payload: Record<string, unknown>) => {
              insertLog.push({ payload, table });
              return Promise.resolve([]);
            },
          }),
        });
      }
    );

    await createProductAction({
      categoryId: "category-1",
      costPrice: "10",
      name: "Produto com imagem",
      price: "20",
      purchasedOn: "2026-03-31",
      stagedImage: {
        contentType: "image/png",
        objectKey: "staging/user-1/image-1",
        size: 128,
      },
      stock: 1,
    });

    expect(mockStoreProductImageFromStage).toHaveBeenCalledTimes(1);
    expect(insertLog[0]?.payload).toMatchObject({
      imageBlurDataUrl: "data:image/webp;base64,abc",
      imageHeight: 900,
      imageVersion: 1,
      imageWidth: 1200,
      name: "Produto com imagem",
    });
  });

  it("removes the current product image and clears image metadata", async () => {
    const { removeProductImageAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb, mockDeleteProductImageVersion } = await resolveMocks();
    const updatePayloads: Record<string, unknown>[] = [];

    mockDb.select.mockReturnValue({
      from: () => ({
        where: async () => [
          {
            id: "product-1",
            imageVersion: 3,
          },
        ],
      }),
    });

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: () => {
          updatePayloads.push(payload);
          return Promise.resolve([]);
        },
      }),
    });

    await removeProductImageAction("product-1");

    expect(updatePayloads[0]).toMatchObject({
      imageBlurDataUrl: null,
      imageHeight: null,
      imageUploadedAt: null,
      imageVersion: null,
      imageWidth: null,
    });
    expect(mockDeleteProductImageVersion).toHaveBeenCalledWith({
      productId: "product-1",
      version: 3,
    });
  });

  it("requires typed confirmation before deleting a product with linked sales", async () => {
    const { deleteProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();

    const harness = createProductDeletionHarness(["sale-1", "sale-2"]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(deleteProductAction("product-1")).rejects.toThrowError(
      `Digite exatamente "${harness.productName}" para confirmar a exclusao com vendas vinculadas.`
    );

    expect(harness.deletedSales).toEqual([]);
    expect(harness.state.deletedProduct).toBe(false);
  });

  it("deletes linked sales before permanently deleting a product", async () => {
    const { deleteProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();

    const harness = createProductDeletionHarness(["sale-1", "sale-2"]);

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await deleteProductAction("product-1", harness.productName);

    expect(harness.deletedSales).toEqual(["sale-1", "sale-2"]);
    expect(harness.state.deletedProduct).toBe(true);
  });
});
