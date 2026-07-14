import type { Metadata } from "next";
import { SalesPanel } from "@/components/sales/sales-panel";
import { loadSalesListPage } from "@/features/sales/list-page";

export const metadata: Metadata = {
  title: "Vendas | Polaris",
  description: "Registro, consulta e cancelamento de vendas do Polaris.",
};

export default async function VendasPage(props: PageProps<"/vendas">) {
  const pageData = await loadSalesListPage(await props.searchParams);

  return (
    <SalesPanel
      analytics={pageData.analytics}
      appliedQuery={pageData.appliedQuery}
      cardInstallmentRules={pageData.cardInstallmentRules}
      dateBounds={pageData.dateBounds}
      initialCursor={pageData.initialCursor}
      role={pageData.role}
      sales={pageData.sales}
      selectedRange={pageData.selectedRange}
      status={pageData.status}
    />
  );
}
