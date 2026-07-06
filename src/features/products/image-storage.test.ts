import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    R2_ACCESS_KEY_ID: "access",
    R2_ACCOUNT_ID: "account",
    R2_BUCKET_PUBLIC: "public",
    R2_BUCKET_STAGING: "staging",
    R2_SECRET_ACCESS_KEY: "secret",
  },
}));

const TENANT_SCOPED_STAGING_KEY_PATTERN =
  /^staging\/org_dg_imports\/user-1\/.+/;

describe("product image staging storage", () => {
  it("scopes staged object keys by organization and user", async () => {
    const { createStagingObjectKey } = await import(
      "@/features/products/image-storage"
    );

    const key = createStagingObjectKey("org_dg_imports", "user-1");

    expect(key).toMatch(TENANT_SCOPED_STAGING_KEY_PATTERN);
  });
});
