import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/products/image-storage", () => ({
  getExpectedProductImageKeys: vi.fn(() => []),
}));

vi.mock("@/lib/entitlements", () => ({
  getOrganizationPlanEntitlements: vi.fn(),
}));

vi.mock("@polaris/db", () => ({
  db: {
    execute: vi.fn(),
    insert: vi.fn(),
    query: {
      member: {
        findFirst: vi.fn(),
      },
      organization: {
        findFirst: vi.fn(),
      },
      products: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const dbModule = await import("@polaris/db");
  const entitlementsModule = await import("@/lib/entitlements");

  return {
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      insert: MockFn;
      query: {
        member: { findFirst: MockFn };
        organization: { findFirst: MockFn };
        products: { findFirst: MockFn };
      };
      select: MockFn;
      transaction: MockFn;
      update: MockFn;
    },
    mockGetOrganizationPlanEntitlements:
      entitlementsModule.getOrganizationPlanEntitlements as MockFn,
  };
};

describe("product image access", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb, mockGetOrganizationPlanEntitlements } =
      await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve([])),
    });
    mockDb.query.products.findFirst.mockResolvedValue({ id: "product-1" });
    mockDb.query.member.findFirst.mockResolvedValue({ id: "member-1" });
    mockDb.query.organization.findFirst.mockResolvedValue({ id: "org-1" });
    mockGetOrganizationPlanEntitlements.mockResolvedValue({
      maxImagesPerProduct: 1,
    });
  });

  it("checks authenticated image reads inside tenant database context", async () => {
    const { canReadProductImage } = await import(
      "@/features/products/image-access"
    );
    const { mockDb } = await resolveMocks();

    await canReadProductImage({
      organizationId: "org_dg_imports",
      productId: "product-1",
      userId: "user-1",
      version: 1,
    });

    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });

  it("records image replacement audit in the same tenant transaction as metadata update", async () => {
    const { replaceProductImageMetadata } = await import(
      "@/features/products/image-access"
    );
    const { mockDb } = await resolveMocks();
    const updateReturning = vi.fn(async () => [{ id: "product-1" }]);
    const auditValues = vi.fn(async () => []);

    mockDb.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: updateReturning,
        })),
      })),
    }));
    mockDb.insert.mockReturnValue({
      values: auditValues,
    });

    const result = await replaceProductImageMetadata({
      actorUserId: "user-1",
      blurDataURL: "data:image/webp;base64,new",
      height: 900,
      newVersion: 4,
      oldVersion: 3,
      organizationId: "org_dg_imports",
      productId: "product-1",
      width: 1200,
    });

    expect(result).toBe(true);
    expect(mockDb.transaction).toHaveBeenCalledOnce();
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        organizationId: "org_dg_imports",
        subjectId: "product-1",
        subjectType: "product_image",
        type: "product_image.replaced",
      })
    );
  });

  it("does not record image replacement audit when metadata update loses the version race", async () => {
    const { replaceProductImageMetadata } = await import(
      "@/features/products/image-access"
    );
    const { mockDb } = await resolveMocks();
    const auditValues = vi.fn(async () => []);

    mockDb.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => []),
        })),
      })),
    }));
    mockDb.insert.mockReturnValue({
      values: auditValues,
    });

    const result = await replaceProductImageMetadata({
      actorUserId: "user-1",
      blurDataURL: "data:image/webp;base64,new",
      height: 900,
      newVersion: 4,
      oldVersion: 3,
      organizationId: "org_dg_imports",
      productId: "product-1",
      width: 1200,
    });

    expect(result).toBe(false);
    expect(auditValues).not.toHaveBeenCalled();
  });

  it("records image removal audit in the same tenant transaction as metadata clear", async () => {
    const { clearProductImageMetadata } = await import(
      "@/features/products/image-access"
    );
    const { mockDb } = await resolveMocks();
    const auditValues = vi.fn(async () => []);

    mockDb.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "product-1" }]),
        })),
      })),
    }));
    mockDb.insert.mockReturnValue({
      values: auditValues,
    });

    const result = await clearProductImageMetadata({
      actorUserId: "user-1",
      currentVersion: 3,
      organizationId: "org_dg_imports",
      productId: "product-1",
    });

    expect(result).toBe(true);
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        organizationId: "org_dg_imports",
        subjectId: "product-1",
        subjectType: "product_image",
        type: "product_image.removed",
      })
    );
  });

  it("rejects a new image when the tenant plan capacity is already occupied", async () => {
    const { appendProductImageMetadata } = await import(
      "@/features/products/image-access"
    );
    const { mockDb } = await resolveMocks();

    mockDb.execute.mockResolvedValue({ rows: [{ id: "product-1" }] });
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([{ position: 0 }]),
        }),
      }),
    });

    await expect(
      appendProductImageMetadata({
        actorUserId: "user-1",
        blurDataUrl: "data:image/webp;base64,new",
        height: 900,
        organizationId: "org_dg_imports",
        productId: "product-1",
        version: 2,
        width: 1200,
      })
    ).rejects.toThrow("Limite de 1 imagens por produto atingido.");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("applies the paid capacity of five images", async () => {
    const { appendProductImageMetadata } = await import(
      "@/features/products/image-access"
    );
    const { mockDb, mockGetOrganizationPlanEntitlements } =
      await resolveMocks();

    mockGetOrganizationPlanEntitlements.mockResolvedValue({
      maxImagesPerProduct: 5,
    });
    mockDb.execute.mockResolvedValue({ rows: [{ id: "product-1" }] });
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () =>
            Promise.resolve([
              { position: 0 },
              { position: 1 },
              { position: 2 },
              { position: 3 },
              { position: 4 },
            ]),
        }),
      }),
    });

    await expect(
      appendProductImageMetadata({
        actorUserId: "user-1",
        blurDataUrl: "data:image/webp;base64,new",
        height: 900,
        organizationId: "org_dg_imports",
        productId: "product-1",
        version: 6,
        width: 1200,
      })
    ).rejects.toThrow("Limite de 5 imagens por produto atingido.");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
