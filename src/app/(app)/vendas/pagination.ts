"use server";

import { loadMoreSalesAction as loadMoreSales } from "@/features/sales/pagination";

export async function loadMoreSalesAction(
  input: Parameters<typeof loadMoreSales>[0]
): Promise<Awaited<ReturnType<typeof loadMoreSales>>> {
  return await loadMoreSales(input);
}
