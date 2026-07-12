import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/features/catalog/server", () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  saveCatalogSettings: vi.fn(),
  updateCategory: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const auth = await import("@/lib/app-session");
  const cache = await import("next/cache");
  const catalogServer = await import("@/features/catalog/server");

  return {
    mockCreateCategory: catalogServer.createCategory as MockFn,
    mockDeleteCategory: catalogServer.deleteCategory as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockRequireAppContext: auth.requireAppContext as MockFn,
    mockSaveCatalogSettings: catalogServer.saveCatalogSettings as MockFn,
    mockUpdateCategory: catalogServer.updateCategory as MockFn,
    mockUpdateTag: cache.updateTag as MockFn,
  };
};

describe("configuration server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before mutating configuration", async () => {
    const { mockRequireAppContext } = await resolveMocks();
    mockRequireAppContext.mockRejectedValue(new Error("Sessao invalida."));

    const { createCategoryAction } = await import("@/features/catalog/actions");

    await expect(
      createCategoryAction({
        description: "Moda",
        name: "Roupas",
      })
    ).rejects.toThrow("Sessao invalida.");
  });

  it("invalidates the catalog tag and refreshes after creating a category", async () => {
    const {
      mockCreateCategory,
      mockRefresh,
      mockRequireAppContext,
      mockUpdateTag,
    } = await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockCreateCategory.mockResolvedValue(undefined);

    const { createCategoryAction } = await import("@/features/catalog/actions");

    await createCategoryAction({
      description: "Moda",
      name: "Roupas",
    });

    expect(mockCreateCategory).toHaveBeenCalledWith(
      "org_dg_imports",
      "user-1",
      {
        description: "Moda",
        name: "Roupas",
      }
    );
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not revalidate when category update is rejected", async () => {
    const {
      mockRefresh,
      mockRequireAppContext,
      mockUpdateCategory,
      mockUpdateTag,
    } = await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockUpdateCategory.mockRejectedValue(
      new Error("Categoria nao encontrada.")
    );

    const { updateCategoryAction } = await import("@/features/catalog/actions");

    await expect(
      updateCategoryAction("category-from-other-tenant", {
        description: "Moda",
        name: "Roupas",
      })
    ).rejects.toThrow("Categoria nao encontrada.");

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not revalidate when category delete is rejected", async () => {
    const {
      mockDeleteCategory,
      mockRefresh,
      mockRequireAppContext,
      mockUpdateTag,
    } = await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockDeleteCategory.mockRejectedValue(
      new Error("Categoria nao encontrada.")
    );

    const { deleteCategoryAction } = await import("@/features/catalog/actions");

    await expect(
      deleteCategoryAction("category-from-other-tenant")
    ).rejects.toThrow("Categoria nao encontrada.");

    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("invalidates the catalog tag and refreshes after saving settings", async () => {
    const {
      mockRefresh,
      mockRequireAppContext,
      mockSaveCatalogSettings,
      mockUpdateTag,
    } = await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "admin",
      userId: "user-1",
    });
    mockSaveCatalogSettings.mockResolvedValue(undefined);

    const { saveCatalogSettingsAction } = await import(
      "@/features/catalog/actions"
    );

    await saveCatalogSettingsAction({
      cardInstallmentRules: [{ feePercent: 3, installments: 3 }],
      idealMarkupPercent: 20,
      minimumMarkupPercent: 10,
    });

    expect(mockSaveCatalogSettings).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(mockRefresh).toHaveBeenCalled();
  });
});
