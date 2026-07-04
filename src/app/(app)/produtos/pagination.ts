"use server";

import { requireAppContext } from "@/lib/app-session";
import { getProductsQuery, type PaginatedProductsList } from "./queries";

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
