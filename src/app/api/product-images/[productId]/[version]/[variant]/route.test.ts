import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/features/products/image-storage", () => ({
  readPublicProductImageVariant: vi.fn(),
}));

describe("GET /api/product-images/[productId]/[version]/[variant]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request has no authenticated session", async () => {
    const { auth } = await import("@/lib/auth");
    const { GET } = await import("./route");

    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/product-images/p1/1/detail"),
      {
        params: Promise.resolve({
          productId: "p1",
          variant: "detail",
          version: "1",
        }),
      }
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 for an invalid variant", async () => {
    const { auth } = await import("@/lib/auth");
    const { GET } = await import("./route");

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    const response = await GET(
      new Request("http://localhost/api/product-images/p1/1/invalid"),
      {
        params: Promise.resolve({
          productId: "p1",
          variant: "invalid",
          version: "1",
        }),
      }
    );

    expect(response.status).toBe(404);
  });

  it("serves bytes with private cache semantics (not the object's public CDN policy)", async () => {
    const { auth } = await import("@/lib/auth");
    const imageStorage = await import("@/features/products/image-storage");
    const { GET } = await import("./route");

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(imageStorage.readPublicProductImageVariant).mockResolvedValue({
      body: Buffer.from([0x00, 0x01]),
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "image/webp",
      etag: '"etag-value"',
    });

    const response = await GET(
      new Request("http://localhost/api/product-images/p1/1/detail"),
      {
        params: Promise.resolve({
          productId: "p1",
          variant: "detail",
          version: "1",
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=0, must-revalidate"
    );
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("ETag")).toBe('"etag-value"');
  });

  it("returns 304 when the client's ETag matches the stored image", async () => {
    const { auth } = await import("@/lib/auth");
    const imageStorage = await import("@/features/products/image-storage");
    const { GET } = await import("./route");

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(imageStorage.readPublicProductImageVariant).mockResolvedValue({
      body: Buffer.from([0x00, 0x01]),
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "image/webp",
      etag: '"etag-value"',
    });

    const response = await GET(
      new Request("http://localhost/api/product-images/p1/1/detail", {
        headers: {
          "if-none-match": '"etag-value"',
        },
      }),
      {
        params: Promise.resolve({
          productId: "p1",
          variant: "detail",
          version: "1",
        }),
      }
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=0, must-revalidate"
    );
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(response.headers.get("ETag")).toBe('"etag-value"');
  });

  it("returns 404 when storage cannot read the object", async () => {
    const { auth } = await import("@/lib/auth");
    const imageStorage = await import("@/features/products/image-storage");
    const { GET } = await import("./route");

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(imageStorage.readPublicProductImageVariant).mockRejectedValue(
      new Error("NoSuchKey")
    );

    const response = await GET(
      new Request("http://localhost/api/product-images/p1/1/detail"),
      {
        params: Promise.resolve({
          productId: "p1",
          variant: "detail",
          version: "1",
        }),
      }
    );

    expect(response.status).toBe(404);
  });
});
