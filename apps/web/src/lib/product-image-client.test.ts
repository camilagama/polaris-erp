import { describe, expect, it } from "vitest";
import { isSessionProxiedProductImageSrc } from "./product-image-client";

describe("isSessionProxiedProductImageSrc", () => {
  it("returns true for authenticated product image API paths", () => {
    expect(
      isSessionProxiedProductImageSrc("/api/product-images/p/3/detail")
    ).toBe(true);
  });

  it("returns false for CDN or absolute URLs", () => {
    expect(
      isSessionProxiedProductImageSrc(
        "https://cdn.example.com/products/p/v1/detail.webp"
      )
    ).toBe(false);
    expect(isSessionProxiedProductImageSrc("/logo.png")).toBe(false);
  });
});
