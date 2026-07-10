import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getRateLimitKeyFromRequest: vi.fn(() => "test-ip"),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/features/products/image-storage", () => ({
  createPresignedProductImageUpload: vi.fn(),
  createStagingObjectKey: vi.fn(),
}));

describe("POST /api/product-images/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 429 with Retry-After when the upload rate limit is exceeded", async () => {
    const { requireAppContext } = await import("@/lib/app-session");
    const auditLog = await import("@/lib/audit-log");
    const { auth } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { POST } = await import("@/app/api/product-images/presign/route");
    const imageStorageModule = await import(
      "@/features/products/image-storage"
    );

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: "user-1",
      },
    } as never);
    vi.mocked(requireAppContext).mockResolvedValue({
      billingStatus: "active",
      hasBillableAccess: true,
      organizationId: "org_dg_imports",
      organizationName: "Polaris",
      role: "owner",
      userId: "user-1",
    });
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce({
        ok: false,
        resetAt: Date.now() + 45_000,
        retryAfterSeconds: 45,
      })
      .mockResolvedValueOnce({
        ok: true,
        remaining: 10,
        resetAt: Date.now() + 60_000,
      });

    const response = await POST(
      new Request("http://localhost/api/product-images/presign", {
        body: JSON.stringify({
          contentType: "image/png",
          size: 120,
        }),
        method: "POST",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas de upload. Tente novamente em instantes.",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(requireAppContext).not.toHaveBeenCalled();
    expect(
      imageStorageModule.createPresignedProductImageUpload
    ).not.toHaveBeenCalled();
    expect(auditLog.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("returns 401 when the request has no authenticated session", async () => {
    const { auth } = await import("@/lib/auth");
    const { POST } = await import("@/app/api/product-images/presign/route");

    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/product-images/presign", {
        body: JSON.stringify({
          contentType: "image/png",
          size: 120,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when the payload is invalid", async () => {
    const { requireAppContext } = await import("@/lib/app-session");
    const { auth } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { POST } = await import("@/app/api/product-images/presign/route");

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: "user-1",
      },
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      ok: true,
      remaining: 10,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/product-images/presign", {
        body: JSON.stringify({
          contentType: "image/gif",
          size: 120,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    expect(requireAppContext).not.toHaveBeenCalled();
  });

  it("returns the signed upload contract for valid requests", async () => {
    const { requireAppContext } = await import("@/lib/app-session");
    const auditLog = await import("@/lib/audit-log");
    const { auth } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { POST } = await import("@/app/api/product-images/presign/route");
    const imageStorageModule = await import(
      "@/features/products/image-storage"
    );

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: "user-1",
      },
    } as never);
    vi.mocked(requireAppContext).mockResolvedValue({
      billingStatus: "active",
      hasBillableAccess: true,
      organizationId: "org_dg_imports",
      organizationName: "Polaris",
      role: "owner",
      userId: "user-1",
    });
    vi.mocked(checkRateLimit).mockResolvedValue({
      ok: true,
      remaining: 10,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(imageStorageModule.createStagingObjectKey).mockReturnValue(
      "staging/org_dg_imports/user-1/file"
    );
    vi.mocked(
      imageStorageModule.createPresignedProductImageUpload
    ).mockResolvedValue({
      expiresIn: 300,
      requiredHeaders: {
        "Content-Type": "image/png",
      },
      uploadUrl: "https://example.com/upload",
    });

    const response = await POST(
      new Request("http://localhost/api/product-images/presign", {
        body: JSON.stringify({
          contentType: "image/png",
          size: 120,
        }),
        method: "POST",
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      objectKey: "staging/org_dg_imports/user-1/file",
      uploadUrl: "https://example.com/upload",
    });
    expect(imageStorageModule.createStagingObjectKey).toHaveBeenCalledWith(
      "org_dg_imports",
      "user-1"
    );
    expect(
      imageStorageModule.createPresignedProductImageUpload
    ).toHaveBeenCalledWith({
      contentType: "image/png",
      objectKey: "staging/org_dg_imports/user-1/file",
      size: 120,
    });
    expect(auditLog.recordAuditEvent).toHaveBeenCalledWith({
      context: {
        billingStatus: "active",
        hasBillableAccess: true,
        organizationId: "org_dg_imports",
        organizationName: "Polaris",
        role: "owner",
        userId: "user-1",
      },
      metadata: {
        contentType: "image/png",
        size: 120,
      },
      subjectId: "staging/org_dg_imports/user-1/file",
      subjectType: "product_image",
      type: "product_image.presign_created",
    });
  });
});
