"use server";

import { getSalesQuery, type PaginatedSalesList } from "./queries";

export async function loadMoreSalesAction(
  cursor: string
): Promise<PaginatedSalesList> {
  const result = await getSalesQuery(cursor);

  return result;
}
