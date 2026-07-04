import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const cache = await import("next/cache");
  const dbModule = await import("@/db");

  return {
    mockCacheLife: cache.cacheLife as MockFn,
    mockCacheTag: cache.cacheTag as MockFn,
    mockDb: dbModule.db as unknown as {
      select: MockFn;
    },
  };
};

describe("sales server caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tags and caches sales date bounds with the shared analytics profile", async () => {
    const { getSalesDateBounds } = await import("@/features/sales/server");
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ minOccurredOn: "2026-03-15" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ minStockedOn: "2026-03-01" }],
        }),
      });

    const result = await getSalesDateBounds("org_dg_imports");

    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(result).toEqual({
      from: "2026-03-01",
      to: expect.any(String),
    });
  });
});
