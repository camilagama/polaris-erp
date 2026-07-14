import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

const resolveCache = async () => {
  const cache = await import("next/cache");

  return {
    refresh: cache.refresh as ReturnType<typeof vi.fn>,
    revalidatePath: cache.revalidatePath as ReturnType<typeof vi.fn>,
    updateTag: cache.updateTag as ReturnType<typeof vi.fn>,
  };
};

describe("domain invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates catalog, analytics, and detail views after product creation", async () => {
    const { productCreated } = await import("@/lib/domain-invalidation");
    const { revalidatePath, updateTag } = await resolveCache();

    productCreated({
      organizationId: "org_dg_imports",
      productId: "product-1",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/produtos");
    expect(updateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(updateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(revalidatePath).toHaveBeenCalledWith("/produtos/product-1");
  });

  it("invalidates catalog and detail views after product detail changes", async () => {
    const { productDetailsChanged } = await import("@/lib/domain-invalidation");
    const { revalidatePath, updateTag } = await resolveCache();

    productDetailsChanged({
      organizationId: "org_dg_imports",
      productId: "product-1",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/produtos");
    expect(updateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(revalidatePath).toHaveBeenCalledWith("/produtos/product-1");
  });

  it("invalidates analytics and product views after inventory changes", async () => {
    const { productInventoryChanged } = await import(
      "@/lib/domain-invalidation"
    );
    const { revalidatePath, updateTag } = await resolveCache();

    productInventoryChanged({
      organizationId: "org_dg_imports",
      productId: "product-1",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/produtos");
    expect(updateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(revalidatePath).toHaveBeenCalledWith("/produtos/product-1");
  });

  it("invalidates sale, product, and analytics views after sale changes", async () => {
    const { saleChanged } = await import("@/lib/domain-invalidation");
    const { revalidatePath, updateTag } = await resolveCache();

    saleChanged({
      organizationId: "org_dg_imports",
      saleId: "sale-1",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/vendas");
    expect(revalidatePath).toHaveBeenCalledWith("/produtos");
    expect(revalidatePath).toHaveBeenCalledWith("/produtos/[id]", "page");
    expect(updateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(revalidatePath).toHaveBeenCalledWith("/vendas/sale-1");
  });

  it("invalidates catalog settings views after catalog configuration changes", async () => {
    const { catalogConfigurationChanged } = await import(
      "@/lib/domain-invalidation"
    );
    const { refresh, updateTag } = await resolveCache();

    catalogConfigurationChanged("org_dg_imports");

    expect(updateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(refresh).toHaveBeenCalled();
  });
});
