import type { Metadata } from "next";
import { SalesPanel } from "@/components/sales/sales-panel";
import { getCatalogSettings } from "@/features/catalog/server";
import { resolveSalesDateRange } from "@/features/sales/date-range";
import { getSalesAnalytics, getSalesDateBounds } from "@/features/sales/server";
import { requirePageAppContext } from "@/lib/app-session";
import { getSaleProductsQuery, getSalesQuery } from "../queries";

export const metadata: Metadata = {
  title: "Vendas | DG Imports",
  description: "Registro, consulta e cancelamento de vendas do DG Imports.",
};

export default async function VendasPage(props: PageProps<"/vendas">) {
  const context = await requirePageAppContext();
  const searchParams = await props.searchParams;
  const bounds = await getSalesDateBounds(context.organizationId);
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status =
    searchParams.status === "completed" || searchParams.status === "cancelled"
      ? searchParams.status
      : "all";
  const selectedRange = resolveSalesDateRange({
    bounds,
    searchParams,
  });
  const [salesResult, saleProducts, analytics, catalogSettings] =
    await Promise.all([
      getSalesQuery({
        organizationId: context.organizationId,
        query,
        status,
      }),
      getSaleProductsQuery(context.organizationId),
      getSalesAnalytics({
        from: selectedRange.from,
        organizationId: context.organizationId,
        to: selectedRange.to,
      }),
      getCatalogSettings(context.organizationId),
    ]);

  return (
    <SalesPanel
      analytics={analytics}
      appliedQuery={query}
      cardInstallmentRules={catalogSettings.cardInstallmentRules}
      dateBounds={bounds}
      initialCursor={salesResult.nextCursor}
      saleProducts={saleProducts}
      sales={salesResult.items}
      selectedRange={selectedRange}
      status={status}
    />
  );
}
