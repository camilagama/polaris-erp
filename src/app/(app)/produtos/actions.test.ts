import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TAGS } from "@/lib/cache-tags";

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
  updateTag: vi.fn(),
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

interface ProductUpdateHarness {
  priceChangeLog: Record<string, unknown>[];
  productUpdateLog: Record<string, unknown>[];
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
  const cache = await import("next/cache");

  return {
    mockDeleteProductImageVersion:
      imageStorageModule.deleteProductImageVersion as MockFn,
    mockDb: dbModule.db as unknown as {
      select: MockFn;
      transaction: MockFn;
      update: MockFn;
    },
    mockGetProductCategoryById: catalogModule.getProductCategoryById as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockSession: sessionModule.getSession as MockFn,
    mockStoreProductImageFromStage:
      imageWorkflowModule.storeProductImageFromStage as MockFn,
    mockUpdateTag: cache.updateTag as MockFn,
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
            price: "20.00",
            stock: state.stock,
          },
        ],
      }),
      insert: (_table: unknown) => ({
        values: (payload: Record<string, unknown>) => {
          if ("stockedOn" in payload && "unitCost" in payload) {
            entryLog.push(payload);
            return Promise.resolve([]);
          }

          if ("happenedOn" in payload && "reason" in payload) {
            writeOffLog.push(payload);
            return Promise.resolve([]);
          }

          throw new Error("Tabela de insert nao suportada no teste.");
        },
      }),
      update: (_table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => {
            if (!("stock" in payload || "costPrice" in payload)) {
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

const createProductUpdateHarness = (initialState: {
  categoryId: string;
  description: string | null;
  name: string;
  price: number;
}): ProductUpdateHarness => {
  const state = { ...initialState };
  const productUpdateLog: Record<string, unknown>[] = [];
  const priceChangeLog: Record<string, unknown>[] = [];

  const transaction = async <T>(callback: (tx: unknown) => Promise<T>) => {
    const tx = {
      execute: async () => ({
        rows: [
          {
            archivedAt: null,
            costPrice: "10.00",
            id: "product-1",
            price: state.price.toFixed(2),
            stock: 4,
          },
        ],
      }),
      insert: (_table: unknown) => ({
        values: (payload: Record<string, unknown>) => {
          if (!("previousPrice" in payload && "nextPrice" in payload)) {
            throw new Error("Tabela de insert nao suportada no teste.");
          }

          priceChangeLog.push(payload);
          return Promise.resolve([]);
        },
      }),
      update: (_table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => {
            if (
              !(
                "categoryId" in payload ||
                "description" in payload ||
                "name" in payload ||
                "price" in payload
              )
            ) {
              throw new Error("Tabela de update nao suportada no teste.");
            }

            productUpdateLog.push(payload);
            state.categoryId =
              typeof payload.categoryId === "string"
                ? payload.categoryId
                : state.categoryId;
            state.description =
              typeof payload.description === "string" ||
              payload.description === undefined
                ? (payload.description ?? null)
                : state.description;
            state.name =
              typeof payload.name === "string" ? payload.name : state.name;
            state.price =
              typeof payload.price === "string"
                ? Number(payload.price)
                : state.price;

            return Promise.resolve([]);
          },
        }),
      }),
    };

    return await callback(tx);
  };

  return {
    priceChangeLog,
    productUpdateLog,
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
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

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
    expect(mockUpdateTag).toHaveBeenCalledWith(CACHE_TAGS.analyticsShared);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("creates a product with processed image metadata when a staged image is provided", async () => {
    const { createProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const {
      mockDb,
      mockRefresh,
      mockStoreProductImageFromStage,
      mockUpdateTag,
    } = await resolveMocks();
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
    expect(mockUpdateTag).toHaveBeenCalledWith(CACHE_TAGS.catalog);
    expect(mockUpdateTag).toHaveBeenCalledWith(CACHE_TAGS.analyticsShared);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("updates product price and records a price history row when the value changes", async () => {
    const { updateProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    const harness = createProductUpdateHarness({
      categoryId: "category-1",
      description: "Descricao antiga",
      name: "Produto teste",
      price: 20,
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await updateProductAction("product-1", {
      categoryId: "category-2",
      description: "Descricao nova",
      name: "Produto atualizado",
      price: "35",
    });

    expect(harness.productUpdateLog[0]).toMatchObject({
      categoryId: "category-2",
      description: "Descricao nova",
      name: "Produto atualizado",
      price: "35.00",
    });
    expect(harness.priceChangeLog).toEqual([
      expect.objectContaining({
        changedByUserId: "user-1",
        nextPrice: "35.00",
        previousPrice: "20.00",
        productId: "product-1",
      }),
    ]);
    expect(mockUpdateTag).toHaveBeenCalledWith(CACHE_TAGS.catalog);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not record price history when the product price remains the same", async () => {
    const { updateProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();

    const harness = createProductUpdateHarness({
      categoryId: "category-1",
      description: null,
      name: "Produto teste",
      price: 20,
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await updateProductAction("product-1", {
      categoryId: "category-1",
      description: undefined,
      name: "Produto teste",
      price: "20",
    });

    expect(harness.productUpdateLog[0]).toMatchObject({
      name: "Produto teste",
      price: "20.00",
    });
    expect(harness.priceChangeLog).toEqual([]);
  });

  it("rejects negative product price updates at the action boundary", async () => {
    const { updateProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();

    await expect(
      updateProductAction("product-1", {
        categoryId: "category-1",
        description: "Descricao",
        name: "Produto teste",
        price: "-1",
      })
    ).rejects.toThrowError("Preco invalido.");

    expect(mockDb.transaction).not.toHaveBeenCalled();
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

  it("archives a product by stamping archivedAt", async () => {
    const { archiveProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();
    const updatePayloads: Record<string, unknown>[] = [];

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: () => {
          updatePayloads.push(payload);
          return Promise.resolve([]);
        },
      }),
    });

    await archiveProductAction("product-1");

    expect(updatePayloads[0]?.archivedAt).toBeInstanceOf(Date);
  });

  it("unarchives a product by clearing archivedAt", async () => {
    const { unarchiveProductAction } = await import(
      "@/app/(app)/produtos/actions"
    );
    const { mockDb } = await resolveMocks();
    const updatePayloads: Record<string, unknown>[] = [];

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: () => {
          updatePayloads.push(payload);
          return Promise.resolve([]);
        },
      }),
    });

    await unarchiveProductAction("product-1");

    expect(updatePayloads[0]).toMatchObject({
      archivedAt: null,
    });
  });
});
