import { beforeEach, describe, expect, it, vi } from "vitest";

const serverEnvMock = vi.hoisted(() => ({
  BETTER_AUTH_URL: "https://app.example.com/api/auth",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  R2_PUBLIC_BASE_URL: undefined as string | undefined,
}));

vi.mock("@/lib/env", () => ({
  serverEnv: serverEnvMock,
}));

import { buildProductImageObjectKey, buildProductImageUrl } from "./image-urls";

describe("buildProductImageUrl", () => {
  beforeEach(() => {
    serverEnvMock.R2_PUBLIC_BASE_URL = undefined;
    serverEnvMock.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    serverEnvMock.BETTER_AUTH_URL = "https://app.example.com/api/auth";
  });

  it("uses the authenticated API path when the public base URL is missing", () => {
    expect(buildProductImageUrl("org1", "p1", 2, "detail")).toBe(
      "/api/product-images/org1/p1/2/detail"
    );
  });

  it("uses the CDN URL when the public base is on a different origin", () => {
    serverEnvMock.R2_PUBLIC_BASE_URL = "https://cdn.example.com";
    expect(buildProductImageUrl("org1", "p1", 2, "detail")).toBe(
      "https://cdn.example.com/organizations/org1/products/p1/v2/detail.webp"
    );
  });

  it("ignores a public base URL that matches the app origin", () => {
    serverEnvMock.R2_PUBLIC_BASE_URL = "https://app.example.com";
    expect(buildProductImageUrl("org1", "p1", 2, "table")).toBe(
      "/api/product-images/org1/p1/2/table"
    );
  });

  it("ignores a public base URL that matches the Better Auth origin", () => {
    serverEnvMock.BETTER_AUTH_URL = "https://auth.example.com/api/auth";
    serverEnvMock.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    serverEnvMock.R2_PUBLIC_BASE_URL = "https://auth.example.com";
    expect(buildProductImageUrl("org1", "p1", 1, "detail")).toBe(
      "/api/product-images/org1/p1/1/detail"
    );
  });

  it("ignores placeholder public base URLs", () => {
    serverEnvMock.R2_PUBLIC_BASE_URL = "https://media.seu-dominio.com";
    expect(buildProductImageUrl("org1", "p1", 1, "detail")).toBe(
      "/api/product-images/org1/p1/1/detail"
    );
  });

  it("namespaces stored image keys by organization", () => {
    expect(buildProductImageObjectKey("org1", "p1", 3, "table")).toBe(
      "organizations/org1/products/p1/v3/table.webp"
    );
  });
});
