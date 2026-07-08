import { expect, test } from "@playwright/test";

test("product image fallback API rejects unauthenticated requests", async ({
  request,
}) => {
  const response = await request.get(
    "/api/product-images/smoke-organization/smoke-product/1/detail"
  );
  expect(response.status()).toBe(401);
});
