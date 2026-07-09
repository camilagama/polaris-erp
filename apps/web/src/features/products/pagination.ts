"use server";

import {
  getProductsQuery,
  type PaginatedProductsList,
} from "@/features/products/queries";
import { requireAppContext } from "@/lib/app-session";

export async function loadMoreProductsAction(
  input: Omit<Parameters<typeof getProductsQuery>[0], "organizationId">
): Promise<PaginatedProductsList> {
  const context = await requireAppContext("catalog:read");
  const result = await getProductsQuery({
    ...input,
    organizationId: context.organizationId,
  });

  return result;
}
