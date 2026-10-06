import { describe, expect, it, vi } from "vitest";

const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;

vi.mock("server-only", () => ({}));

const syntheticServerEnv = vi.hoisted(() => ({
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_ACCOUNT_ID: "account",
  R2_BUCKET_FINAL: "final",
  R2_BUCKET_STAGING: "staging",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
}));

vi.mock("@/lib/env", () => ({
  serverEnv: syntheticServerEnv,
}));

describe("product image presigning with the installed AWS SDK", () => {
  it("generates a signed R2 URL locally without sending a request", async () => {
    const { createPresignedProductImageUpload } = await import(
      "@/features/products/image-storage"
    );

    const result = await createPresignedProductImageUpload({
      contentType: "image/webp",
      objectKey: "staging/org_dg_imports/user-1/fixed-image.webp",
      size: 1024,
    });
    const url = new URL(result.uploadUrl);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("staging.account.r2.cloudflarestorage.com");
    expect(url.pathname).toBe(
      "/staging/org_dg_imports/user-1/fixed-image.webp"
    );
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("host");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(SIGNATURE_PATTERN);
    expect(result.expiresIn).toBe(300);
    expect(result.requiredHeaders).toEqual({
      "Content-Type": "image/webp",
    });
  });
});
