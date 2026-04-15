import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TAGS } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/server-action-auth", () => ({
  requireActionSession: vi.fn(),
}));

vi.mock("@/features/catalog/server", () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  saveCatalogSettings: vi.fn(),
  updateCategory: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const auth = await import("@/lib/server-action-auth");
  const cache = await import("next/cache");
  const catalogServer = await import("@/features/catalog/server");

  return {
    mockCreateCategory: catalogServer.createCategory as MockFn,
    mockRefresh: cache.refresh as MockFn,
    mockRequireSession: auth.requireActionSession as MockFn,
    mockSaveCatalogSettings: catalogServer.saveCatalogSettings as MockFn,
    mockUpdateTag: cache.updateTag as MockFn,
  };
};

describe("configuration server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before mutating configuration", async () => {
    const { mockRequireSession } = await resolveMocks();
    mockRequireSession.mockRejectedValue(new Error("Sessao invalida."));

    const { createCategoryAction } = await import(
      "@/app/(app)/configuracoes/actions"
    );

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
      mockRequireSession,
      mockUpdateTag,
    } = await resolveMocks();

    mockRequireSession.mockResolvedValue({ user: { id: "user-1" } });
    mockCreateCategory.mockResolvedValue(undefined);

    const { createCategoryAction } = await import(
      "@/app/(app)/configuracoes/actions"
    );

    await createCategoryAction({
      description: "Moda",
      name: "Roupas",
    });

    expect(mockCreateCategory).toHaveBeenCalledWith({
      description: "Moda",
      name: "Roupas",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith(CACHE_TAGS.catalog);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("invalidates the catalog tag and refreshes after saving settings", async () => {
    const {
      mockRefresh,
      mockRequireSession,
      mockSaveCatalogSettings,
      mockUpdateTag,
    } = await resolveMocks();

    mockRequireSession.mockResolvedValue({ user: { id: "user-1" } });
    mockSaveCatalogSettings.mockResolvedValue(undefined);

    const { saveCatalogSettingsAction } = await import(
      "@/app/(app)/configuracoes/actions"
    );

    await saveCatalogSettingsAction({
      cardInstallmentRules: [{ feePercent: 3, installments: 3 }],
      idealMarkupPercent: 20,
      minimumMarkupPercent: 10,
    });

    expect(mockSaveCatalogSettings).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith(CACHE_TAGS.catalog);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
