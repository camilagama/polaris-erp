import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  getAppContext: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  recordAuditEvent: vi.fn(),
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
    const { auth } = await import("@/lib/auth");
    const { POST } = await import("@/app/api/product-images/presign/route");

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: "user-1",
      },
    } as never);

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
  });

  it("returns the signed upload contract for valid requests", async () => {
    const { getAppContext } = await import("@/lib/app-session");
    const auditLog = await import("@/lib/audit-log");
    const { auth } = await import("@/lib/auth");
    const { POST } = await import("@/app/api/product-images/presign/route");
    const imageStorageModule = await import(
      "@/features/products/image-storage"
    );

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: "user-1",
      },
    } as never);
    vi.mocked(getAppContext).mockResolvedValue({
      organizationId: "org_dg_imports",
      organizationName: "DG Imports",
      role: "owner",
      userId: "user-1",
    });
    vi.mocked(imageStorageModule.createStagingObjectKey).mockReturnValue(
      "staging/user-1/file"
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
      objectKey: "staging/user-1/file",
      uploadUrl: "https://example.com/upload",
    });
    expect(
      imageStorageModule.createPresignedProductImageUpload
    ).toHaveBeenCalledWith({
      contentType: "image/png",
      objectKey: "staging/user-1/file",
      size: 120,
    });
    expect(auditLog.recordAuditEvent).toHaveBeenCalledWith({
      context: {
        organizationId: "org_dg_imports",
        organizationName: "DG Imports",
        role: "owner",
        userId: "user-1",
      },
      metadata: {
        contentType: "image/png",
        size: 120,
      },
      subjectId: "staging/user-1/file",
      subjectType: "product_image",
      type: "product_image.presign_created",
    });
  });
});
