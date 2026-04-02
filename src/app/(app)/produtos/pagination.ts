"use server";

import { getProductsQuery, type PaginatedProductsList } from "./queries";

export async function loadMoreProductsAction(
  cursor: string
): Promise<PaginatedProductsList> {
  const result = await getProductsQuery(cursor);

  return result;
}
