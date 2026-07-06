"use server";

import {
  getSalesQuery,
  type PaginatedSalesList,
} from "@/features/sales/queries";
import { requireAppContext } from "@/lib/app-session";

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
