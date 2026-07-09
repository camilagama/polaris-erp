import type { Metadata } from "next";
import { SalesPanel } from "@/components/sales/sales-panel";
import { getCatalogSettings } from "@/features/catalog/server";
import { resolveSalesDateRange } from "@/features/sales/date-range";
import { getSaleProductsQuery, getSalesQuery } from "@/features/sales/queries";
import { getSalesAnalytics, getSalesDateBounds } from "@/features/sales/server";
import { requirePageAppContext } from "@/lib/app-session";

export const metadata: Metadata = {
  title: "Vendas | Polaris",
  description: "Registro, consulta e cancelamento de vendas do Polaris.",
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
  const salesResult = await getSalesQuery({
    organizationId: context.organizationId,
    query,
    status,
  });
  const saleProducts = await getSaleProductsQuery(context.organizationId);
  const analytics = await getSalesAnalytics({
    from: selectedRange.from,
    organizationId: context.organizationId,
    to: selectedRange.to,
  });
  const catalogSettings = await getCatalogSettings(context.organizationId);

  return (
    <SalesPanel
      analytics={analytics}
      appliedQuery={query}
      cardInstallmentRules={catalogSettings.cardInstallmentRules}
      dateBounds={bounds}
      initialCursor={salesResult.nextCursor}
      role={context.role}
      saleProducts={saleProducts}
      sales={salesResult.items}
      selectedRange={selectedRange}
      status={status}
    />
  );
}
