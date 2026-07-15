import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createTransaction = (entitlements: unknown) => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi
              .fn()
              .mockResolvedValue(
                entitlements === null ? [] : [{ entitlements }]
              ),
          })),
        })),
      })),
    })),
  })),
});

describe("organization entitlements", () => {
  it("uses the current active plan entitlements", async () => {
    const { getOrganizationPlanEntitlements } = await import(
      "@/lib/entitlements"
    );
    const tx = createTransaction([
      { key: "catalog.products.limit", value: 250 },
      { key: "goals.active.limit", value: 3 },
      { key: "product.images.limit", value: 5 },
    ]);

    await expect(
      getOrganizationPlanEntitlements(tx as never, "org-1")
    ).resolves.toEqual({
      maxActiveGoals: 3,
      maxImagesPerProduct: 5,
      maxRegisteredProducts: 250,
    });
  });

  it("fails closed to Free quotas without an active subscription", async () => {
    const { getOrganizationPlanEntitlements } = await import(
      "@/lib/entitlements"
    );
    const tx = createTransaction(null);

    await expect(
      getOrganizationPlanEntitlements(tx as never, "org-1")
    ).resolves.toEqual({
      maxActiveGoals: 1,
      maxImagesPerProduct: 1,
      maxRegisteredProducts: 50,
    });
  });
});
