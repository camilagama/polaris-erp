import { beforeEach, describe, expect, it, vi } from "vitest";

const serverEnvMock = vi.hoisted(() => ({
  R2_ACCESS_KEY_ID: "access" as string | undefined,
  R2_ACCOUNT_ID: "account" as string | undefined,
  R2_BUCKET_PUBLIC: "public" as string | undefined,
  R2_BUCKET_STAGING: "staging" as string | undefined,
  R2_SECRET_ACCESS_KEY: "secret" as string | undefined,
}));

vi.mock("@/lib/env", () => ({
  serverEnv: serverEnvMock,
}));

import {
  buildProductImageObjectKey,
  buildProductImageUrl,
  isProductImageStorageConfigured,
} from "./image-urls";

describe("buildProductImageUrl", () => {
  beforeEach(() => {
    serverEnvMock.R2_ACCESS_KEY_ID = "access";
    serverEnvMock.R2_ACCOUNT_ID = "account";
    serverEnvMock.R2_BUCKET_PUBLIC = "public";
    serverEnvMock.R2_BUCKET_STAGING = "staging";
    serverEnvMock.R2_SECRET_ACCESS_KEY = "secret";
  });

  it("always uses the authenticated API path", () => {
    expect(buildProductImageUrl("org1", "p1", 2, "detail")).toBe(
      "/api/product-images/org1/p1/2/detail"
    );
  });

  it("does not require a public CDN base URL for storage readiness", () => {
    expect(isProductImageStorageConfigured()).toBe(true);
  });

  it("namespaces stored image keys by organization", () => {
    expect(buildProductImageObjectKey("org1", "p1", 3, "table")).toBe(
      "organizations/org1/products/p1/v3/table.webp"
    );
  });
});
