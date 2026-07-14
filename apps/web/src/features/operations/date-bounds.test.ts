import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@polaris/db", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const cache = await import("next/cache");
  const dbModule = await import("@polaris/db");

  return {
    mockCacheLife: cache.cacheLife as MockFn,
    mockCacheTag: cache.cacheTag as MockFn,
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      select: MockFn;
      transaction: MockFn;
    },
  };
};

const mockBoundsRows = async ({
  minOccurredOn,
  minStockedOn,
}: {
  minOccurredOn: string | null;
  minStockedOn: string | null;
}) => {
  const { mockDb } = await resolveMocks();

  mockDb.select
    .mockReturnValueOnce({
      from: () => ({
        where: async () => [{ minOccurredOn }],
      }),
    })
    .mockReturnValueOnce({
      from: () => ({
        where: async () => [{ minStockedOn }],
      }),
    });
};

describe("operational date bounds", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
  });

  it("uses today's date when there are no sales or stock entries", async () => {
    const { getOperationalDateBounds } = await import(
      "@/features/operations/date-bounds"
    );

    await mockBoundsRows({ minOccurredOn: null, minStockedOn: null });

    await expect(getOperationalDateBounds("org_dg_imports")).resolves.toEqual({
      from: expect.any(String),
      to: expect.any(String),
    });
  });

  it("uses the first sale date when only sales exist", async () => {
    const { getOperationalDateBounds } = await import(
      "@/features/operations/date-bounds"
    );

    await mockBoundsRows({
      minOccurredOn: "2026-03-10",
      minStockedOn: null,
    });

    await expect(getOperationalDateBounds("org_dg_imports")).resolves.toEqual({
      from: "2026-03-10",
      to: expect.any(String),
    });
  });

  it("uses the first stock date when only stock entries exist", async () => {
    const { getOperationalDateBounds } = await import(
      "@/features/operations/date-bounds"
    );

    await mockBoundsRows({
      minOccurredOn: null,
      minStockedOn: "2026-03-01",
    });

    await expect(getOperationalDateBounds("org_dg_imports")).resolves.toEqual({
      from: "2026-03-01",
      to: expect.any(String),
    });
  });

  it("uses the earliest operational date across sales and stock entries", async () => {
    const { getOperationalDateBounds } = await import(
      "@/features/operations/date-bounds"
    );
    const { mockCacheLife, mockCacheTag } = await resolveMocks();

    await mockBoundsRows({
      minOccurredOn: "2026-03-10",
      minStockedOn: "2026-03-01",
    });

    await expect(getOperationalDateBounds("org_dg_imports")).resolves.toEqual({
      from: "2026-03-01",
      to: expect.any(String),
    });
    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
  });
});
