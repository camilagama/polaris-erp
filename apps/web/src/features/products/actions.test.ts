import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/features/catalog/server", () => ({
  getProductCategoryById: vi.fn(),
}));

vi.mock("@/features/products/image-workflow", () => ({
  storeProductImageFromStage: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({
  getOrganizationPlanEntitlements: vi.fn().mockResolvedValue({
    maxActiveGoals: 1,
    maxImagesPerProduct: 1,
    maxRegisteredProducts: 50,
  }),
}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@polaris/db", () => ({
  db: {
    delete: vi.fn(),
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  },
}));

const { completeCommandExecutionMock, reserveCommandExecutionMock } =
  vi.hoisted(() => ({
    completeCommandExecutionMock: vi.fn(),
    reserveCommandExecutionMock: vi.fn(),
  }));

vi.mock("@polaris/events", () => ({
  completeCommandExecution: completeCommandExecutionMock,
  reserveCommandExecution: reserveCommandExecutionMock,
}));

const ISO_DATE_ERROR_REGEX = /ISO YYYY-MM-DD/;

interface InventoryHarness {
  auditLog: Record<string, unknown>[];
  entryLog: Record<string, unknown>[];
  state: {
    archivedAt: Date | null;
    costPrice: number;
    stock: number;
  };
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
  writeOffLog: Record<string, unknown>[];
}

interface ProductUpdateHarness {
  auditLog: Record<string, unknown>[];
  executeLog: string[];
  priceChangeLog: Record<string, unknown>[];
  productUpdateLog: Record<string, unknown>[];
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
}

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const sessionModule = await import("@/lib/session");
  const appSessionModule = await import("@/lib/app-session");
  const catalogModule = await import("@/features/catalog/server");
  const dbModule = await import("@polaris/db");
  const imageWorkflowModule = await import(
    "@/features/products/image-workflow"
  );
  const cache = await import("next/cache");

  return {
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      insert: MockFn;
      select: MockFn;
      transaction: MockFn;
      update: MockFn;
    },
    mockGetProductCategoryById: catalogModule.getProductCategoryById as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockRequireAppContext: appSessionModule.requireAppContext as MockFn,
    mockSession: sessionModule.getSession as MockFn,
    mockStoreProductImageFromStage:
      imageWorkflowModule.storeProductImageFromStage as MockFn,
    mockUpdateTag: cache.updateTag as MockFn,
  };
};

const createInventoryHarness = (
  initialState: {
    archivedAt?: Date | null;
    costPrice: number;
    stock: number;
  },
  options: { loseProductUpdate?: boolean } = {}
): InventoryHarness => {
  const state = { archivedAt: null, ...initialState };
  const auditLog: Record<string, unknown>[] = [];
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
            archivedAt: state.archivedAt,
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

          if ("delta" in payload && "sourceId" in payload) {
            return Promise.resolve([]);
          }

          if ("subjectType" in payload) {
            auditLog.push(payload);
            return Promise.resolve([]);
          }

          throw new Error("Tabela de insert nao suportada no teste.");
        },
      }),
      update: (_table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => ({
            returning: () => {
              if (options.loseProductUpdate) {
                return Promise.resolve([]);
              }

              if (!("stock" in payload || "costPrice" in payload)) {
                throw new Error("Tabela de update nao suportada no teste.");
              }

              if (typeof payload.stock === "number") {
                state.stock = payload.stock;
              }

              if (typeof payload.costPrice === "string") {
                state.costPrice = Number(payload.costPrice);
              }

              if ("archivedAt" in payload) {
                state.archivedAt =
                  payload.archivedAt instanceof Date
                    ? payload.archivedAt
                    : null;
              }

              return Promise.resolve([{ id: "product-1" }]);
            },
          }),
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
    auditLog,
    entryLog,
    state,
    transaction,
    writeOffLog,
  };
};

const createProductUpdateHarness = (
  initialState: {
    categoryId: string;
    description: string | null;
    name: string;
    price: number;
  },
  options: { loseProductUpdate?: boolean } = {}
): ProductUpdateHarness => {
  const state = { ...initialState };
  const auditLog: Record<string, unknown>[] = [];
  const executeLog: string[] = [];
  const productUpdateLog: Record<string, unknown>[] = [];
  const priceChangeLog: Record<string, unknown>[] = [];

  const transaction = async <T>(callback: (tx: unknown) => Promise<T>) => {
    const tx = {
      execute: () => {
        executeLog.push("execute");

        return Promise.resolve({
          rows: [
            {
              archivedAt: null,
              costPrice: "10.00",
              id: "product-1",
              price: state.price.toFixed(2),
              stock: 4,
            },
          ],
        });
      },
      query: {
        categories: {
          findFirst: () => Promise.resolve({ id: "category-1" }),
        },
      },
      insert: (_table: unknown) => ({
        values: (payload: Record<string, unknown>) => {
          if (!("previousPrice" in payload && "nextPrice" in payload)) {
            if ("subjectType" in payload) {
              auditLog.push(payload);
              return Promise.resolve([]);
            }

            throw new Error("Tabela de insert nao suportada no teste.");
          }

          priceChangeLog.push(payload);
          return Promise.resolve([]);
        },
      }),
      update: (_table: unknown) => ({
        set: (payload: Record<string, unknown>) => ({
          where: (_whereExpression: unknown) => ({
            returning: () => {
              if (options.loseProductUpdate) {
                return Promise.resolve([]);
              }

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

              return Promise.resolve([{ id: "product-1" }]);
            },
          }),
        }),
      }),
    };

    return await callback(tx);
  };

  return {
    auditLog,
    executeLog,
    priceChangeLog,
    productUpdateLog,
    transaction,
  };
};

describe("product server actions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const {
      mockDb,
      mockGetProductCategoryById,
      mockRequireAppContext,
      mockSession,
      mockStoreProductImageFromStage,
    } = await resolveMocks();

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

    mockGetProductCategoryById.mockResolvedValue({
      id: "category-1",
    });
    completeCommandExecutionMock.mockResolvedValue(true);
    reserveCommandExecutionMock.mockResolvedValue({
      commandId: "command-1",
      kind: "new",
    });

    mockDb.insert.mockReturnValue({
      values: () => Promise.resolve([]),
    });
    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockStoreProductImageFromStage.mockResolvedValue({
      blurDataURL: "data:image/webp;base64,abc",
      height: 900,
      version: 1,
      width: 1200,
    });
  });

  it("requires authentication before mutating stock", async () => {
    const { addProductStockAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockRequireAppContext } = await resolveMocks();

    mockRequireAppContext.mockRejectedValueOnce(
      new Error("Sessao invalida. Faca login novamente.")
    );

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
    const { createProductAction } = await import("@/features/products/actions");
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
      "@/features/products/actions"
    );
    const { mockDb, mockUpdateTag } = await resolveMocks();

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
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
  });

  it("reactivates an archived product when stock is added", async () => {
    const { addProductStockAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb } = await resolveMocks();

    const harness = createInventoryHarness({
      archivedAt: new Date("2026-03-01T00:00:00.000Z"),
      costPrice: 10,
      stock: 0,
    });

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await addProductStockAction("product-1", {
      quantity: 2,
      stockedOn: "2026-03-31",
      unitCost: "14.00",
    });

    expect(harness.state.archivedAt).toBeNull();
    expect(harness.state.stock).toBe(2);
  });

  it("does not revalidate when stock addition loses the product update", async () => {
    const { addProductStockAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockUpdateTag } = await resolveMocks();

    const harness = createInventoryHarness(
      {
        costPrice: 10,
        stock: 0,
      },
      { loseProductUpdate: true }
    );

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(
      addProductStockAction("product-1", {
        quantity: 2,
        stockedOn: "2026-03-31",
        unitCost: "14.00",
      })
    ).rejects.toThrow("Produto nao encontrado.");

    expect(harness.auditLog).toHaveLength(0);
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("does not revalidate when stock write-off loses the product update", async () => {
    const { writeOffProductStockAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockUpdateTag } = await resolveMocks();

    const harness = createInventoryHarness(
      {
        costPrice: 10,
        stock: 5,
      },
      { loseProductUpdate: true }
    );

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(
      writeOffProductStockAction("product-1", {
        happenedOn: "2026-03-31",
        notes: "baixa operacional",
        quantity: 2,
        reason: "operational",
      })
    ).rejects.toThrow("Produto nao encontrado.");

    expect(harness.auditLog).toHaveLength(0);
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("creates a product with processed image metadata when a staged image is provided", async () => {
    const { createProductAction } = await import("@/features/products/actions");
    const { mockDb, mockStoreProductImageFromStage, mockUpdateTag } =
      await resolveMocks();
    const insertLog: Record<string, unknown>[] = [];

    mockDb.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<void>) => {
        await callback({
          execute: () => Promise.resolve({ rows: [] }),
          query: {
            categories: {
              findFirst: () => Promise.resolve({ id: "category-1" }),
            },
          },
          insert: (table: unknown) => ({
            values: (payload: Record<string, unknown>) => {
              insertLog.push({ payload, table });
              return Promise.resolve([]);
            },
          }),
          select: () => ({
            from: () => ({
              where: () => Promise.resolve([{ value: 0 }]),
            }),
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
        objectKey: "staging/org_dg_imports/user-1/image-1",
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
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
  });

  it("updates product price and records a price history row when the value changes", async () => {
    const { updateProductAction } = await import("@/features/products/actions");
    const { mockDb, mockUpdateTag } = await resolveMocks();

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
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
  });

  it("sets tenant database context before updating a product", async () => {
    const { updateProductAction } = await import("@/features/products/actions");
    const { mockDb } = await resolveMocks();

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

    expect(harness.executeLog).toHaveLength(2);
  });

  it("does not record price history when the product price remains the same", async () => {
    const { updateProductAction } = await import("@/features/products/actions");
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

  it("does not revalidate when a price update loses the product row", async () => {
    const { updateProductAction } = await import("@/features/products/actions");
    const { mockDb, mockUpdateTag } = await resolveMocks();

    const harness = createProductUpdateHarness(
      {
        categoryId: "category-1",
        description: "Descricao antiga",
        name: "Produto teste",
        price: 20,
      },
      { loseProductUpdate: true }
    );

    mockDb.transaction.mockImplementation(harness.transaction as never);

    await expect(
      updateProductAction("product-1", {
        categoryId: "category-2",
        description: "Descricao nova",
        name: "Produto atualizado",
        price: "35",
      })
    ).rejects.toThrow("Produto nao encontrado.");

    expect(harness.auditLog).toHaveLength(0);
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("rejects negative product price updates at the action boundary", async () => {
    const { updateProductAction } = await import("@/features/products/actions");
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
      "@/features/products/actions"
    );
    const { mockDb } = await resolveMocks();
    const updatePayloads: Record<string, unknown>[] = [];

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "product-1",
              imageVersion: 3,
            },
          ],
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: () => ({
          returning: () => {
            updatePayloads.push(payload);
            return Promise.resolve([{ id: "product-1" }]);
          },
        }),
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
    expect(
      readFileSync(
        join(process.cwd(), "src", "features", "products", "actions.ts"),
        "utf8"
      )
    ).not.toContain("deleteProductImageVersion");
  });

  it("does not delete the stored image when removal loses the version race", async () => {
    const { removeProductImageAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "product-1",
              imageVersion: 3,
            },
          ],
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(removeProductImageAction("product-1")).rejects.toThrow(
      "Imagem do produto foi atualizada por outra operacao. Recarregue e tente novamente."
    );

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("rolls back the new image when replace loses the version race", async () => {
    const { replaceProductImageAction } = await import(
      "@/features/products/actions"
    );
    const {
      mockDb,
      mockRefresh,
      mockStoreProductImageFromStage,
      mockUpdateTag,
    } = await resolveMocks();

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "product-1",
              imageVersion: 3,
            },
          ],
        }),
      }),
    });
    mockStoreProductImageFromStage.mockResolvedValue({
      blurDataURL: "data:image/webp;base64,new",
      height: 900,
      version: 4,
      width: 1200,
    });
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(
      replaceProductImageAction("product-1", {
        contentType: "image/png",
        objectKey: "staging/org_dg_imports/user-1/image-1",
        size: 128,
      })
    ).rejects.toThrow(
      "Imagem do produto foi atualizada por outra operacao. Recarregue e tente novamente."
    );

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not treat another tenant product as image removal success", async () => {
    const { removeProductImageAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    });

    await expect(
      removeProductImageAction("product-from-other-tenant")
    ).rejects.toThrow("Produto nao encontrado.");

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("archives a product by stamping archivedAt", async () => {
    const { archiveProductAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb } = await resolveMocks();
    const updatePayloads: Record<string, unknown>[] = [];

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: () => ({
          returning: () => {
            updatePayloads.push(payload);
            return Promise.resolve([{ id: "product-1" }]);
          },
        }),
      }),
    });

    await archiveProductAction("product-1");

    expect(updatePayloads[0]?.archivedAt).toBeInstanceOf(Date);
  });

  it("does not revalidate when archive targets another tenant", async () => {
    const { archiveProductAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(
      archiveProductAction("product-from-other-tenant")
    ).rejects.toThrow("Produto nao encontrado.");

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("unarchives a product by clearing archivedAt", async () => {
    const { unarchiveProductAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb } = await resolveMocks();
    const updatePayloads: Record<string, unknown>[] = [];

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: () => ({
          returning: () => {
            updatePayloads.push(payload);
            return Promise.resolve([{ id: "product-1" }]);
          },
        }),
      }),
    });

    await unarchiveProductAction("product-1");

    expect(updatePayloads[0]).toMatchObject({
      archivedAt: null,
    });
  });

  it("does not revalidate when unarchive targets another tenant", async () => {
    const { unarchiveProductAction } = await import(
      "@/features/products/actions"
    );
    const { mockDb, mockRefresh, mockUpdateTag } = await resolveMocks();

    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(
      unarchiveProductAction("product-from-other-tenant")
    ).rejects.toThrow("Produto nao encontrado.");

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("delegates product archive state writes to the product domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain("setProductArchivedState");
  });

  it("delegates product image state reads to the image domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain("getProductImageState");
    expect(source).toContain('from "@/features/products/image-access"');
    expect(source).not.toContain("const getProductImageState");
  });

  it("delegates tenant-scoped product locking to the product domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain('from "@/features/products/server"');
    expect(source).not.toContain("const lockProductForUpdate");
    expect(source).not.toContain("lockProductForUpdate(");
    expect(source).not.toContain("for update");
  });

  it("delegates product image metadata writes to the image domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain("replaceProductImageMetadata");
    expect(source).toContain("clearProductImageMetadata");
    expect(source).toContain('from "@/features/products/image-access"');
  });

  it("delegates initial product persistence to the product domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain("createProductWithInitialStock");
    expect(source).toContain('from "@/features/products/server"');
  });

  it("delegates product updates and price history to the product domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain("updateProductWithPriceHistory");
    expect(source).toContain('from "@/features/products/server"');
    expect(source).not.toContain("productPriceChanges");
  });

  it("delegates stock persistence to the product domain", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "features", "products", "actions.ts"),
      "utf8"
    );

    expect(source).toContain("addProductStock");
    expect(source).toContain("writeOffProductStock");
    expect(source).toContain('from "@/features/products/server"');
    expect(source).not.toContain('from "@polaris/db"');
    expect(source).not.toContain('from "@polaris/db/schema"');
    expect(source).not.toContain("productStockEntries");
    expect(source).not.toContain("productStockWriteOffs");
  });
});
