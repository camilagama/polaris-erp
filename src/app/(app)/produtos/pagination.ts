"use server";

import { requireActionSession } from "@/lib/server-action-auth";
import { getProductsQuery, type PaginatedProductsList } from "./queries";

export async function loadMoreProductsAction(
  input: Parameters<typeof getProductsQuery>[0]
): Promise<PaginatedProductsList> {
  await requireActionSession();
  const result = await getProductsQuery(input);

  return result;
}
