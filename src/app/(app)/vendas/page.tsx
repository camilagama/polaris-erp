import type { Metadata } from "next";
import { SalesPanel } from "@/components/sales/sales-panel";
import { resolveSalesDateRange } from "@/features/sales/date-range";
import { getSalesAnalytics, getSalesDateBounds } from "@/features/sales/server";
import { getProductsQuery } from "../produtos/queries";
import { getSalesQuery } from "./queries";

export const metadata: Metadata = {
  title: "Vendas | DG Imports",
  description: "Registro, consulta e cancelamento de vendas do DG Imports.",
};

export default async function VendasPage(props: PageProps<"/vendas">) {
  const searchParams = await props.searchParams;
  const bounds = await getSalesDateBounds();
  const selectedRange = resolveSalesDateRange({
    bounds,
    searchParams,
  });
  const [salesResult, productsResult, analytics] = await Promise.all([
    getSalesQuery(),
    getProductsQuery(),
    getSalesAnalytics({
      from: selectedRange.from,
      to: selectedRange.to,
    }),
  ]);

  const saleProducts = productsResult.items
    .filter((product) => !product.archivedAt && product.stock > 0)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
    }));

  return (
    <SalesPanel
      analytics={analytics}
      dateBounds={bounds}
      saleProducts={saleProducts}
      sales={salesResult.items}
      selectedRange={selectedRange}
    />
  );
}
