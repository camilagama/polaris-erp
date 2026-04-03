"use server";

import { requireActionSession } from "@/lib/server-action-auth";
import { getSalesQuery, type PaginatedSalesList } from "./queries";

export async function loadMoreSalesAction(
  input: Parameters<typeof getSalesQuery>[0]
): Promise<PaginatedSalesList> {
  await requireActionSession();
  const result = await getSalesQuery(input);

  return result;
}
