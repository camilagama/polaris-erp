"use server";

import { loadMoreProductsAction as loadMoreProducts } from "@/features/products/pagination";

export async function loadMoreProductsAction(
  input: Parameters<typeof loadMoreProducts>[0]
): Promise<Awaited<ReturnType<typeof loadMoreProducts>>> {
  return await loadMoreProducts(input);
}
