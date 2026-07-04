"use server";

import { requireAppContext } from "@/lib/app-session";
import { getSalesQuery, type PaginatedSalesList } from "./queries";

export async function loadMoreSalesAction(
  input: Omit<Parameters<typeof getSalesQuery>[0], "organizationId">
): Promise<PaginatedSalesList> {
  const context = await requireAppContext("catalog:read");
  const result = await getSalesQuery({
    ...input,
    organizationId: context.organizationId,
  });

  return result;
}
