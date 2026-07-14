import "server-only";

import { getCatalogSettings } from "@/features/catalog/server";
import { resolveSalesDateRange } from "@/features/sales/date-range";
import { getSalesQuery } from "@/features/sales/queries";
import { getSalesAnalytics, getSalesDateBounds } from "@/features/sales/server";
import { requirePageAppContext } from "@/lib/app-session";

type SearchParams = Record<string, string | string[] | undefined>;

const resolveSalesStatus = (
  value: string | string[] | undefined
): "all" | "cancelled" | "completed" =>
  value === "completed" || value === "cancelled" ? value : "all";

export const loadSalesListPage = async (searchParams: SearchParams) => {
  const context = await requirePageAppContext();
  const bounds = await getSalesDateBounds(context.organizationId);
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = resolveSalesStatus(searchParams.status);
  const selectedRange = resolveSalesDateRange({
    bounds,
    searchParams,
  });
  const [salesResult, analytics, catalogSettings] = await Promise.all([
    getSalesQuery({
      organizationId: context.organizationId,
      query,
      status,
    }),
    getSalesAnalytics({
      from: selectedRange.from,
      organizationId: context.organizationId,
      to: selectedRange.to,
    }),
    getCatalogSettings(context.organizationId),
  ]);

  return {
    analytics,
    appliedQuery: query,
    cardInstallmentRules: catalogSettings.cardInstallmentRules,
    dateBounds: bounds,
    initialCursor: salesResult.nextCursor,
    role: context.role,
    sales: salesResult.items,
    selectedRange,
    status,
  };
};
