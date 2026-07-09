import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/products/image-storage", () => ({
  getExpectedProductImageKeys: vi.fn(() => []),
}));

vi.mock("@polaris/db", () => ({
  db: {
    execute: vi.fn(),
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
    transaction: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const dbModule = await import("@polaris/db");

  return {
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      query: {
        member: { findFirst: MockFn };
        organization: { findFirst: MockFn };
        products: { findFirst: MockFn };
      };
      transaction: MockFn;
    },
  };
};

describe("product image access", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.query.products.findFirst.mockResolvedValue({ id: "product-1" });
    mockDb.query.member.findFirst.mockResolvedValue({ id: "member-1" });
    mockDb.query.organization.findFirst.mockResolvedValue({ id: "org-1" });
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
});
