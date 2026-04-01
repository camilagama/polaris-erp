import type { Metadata } from "next";
import { SalesPanel } from "@/components/sales/sales-panel";
import { getCatalogSettings } from "@/features/catalog/server";
import { getProductsQuery } from "../produtos/queries";
import { getSalesQuery } from "./queries";

export const metadata: Metadata = {
  title: "Vendas | DG Imports",
  description: "Registro, consulta e cancelamento de vendas do DG Imports.",
};

export default async function VendasPage() {
  const [sales, products, settings] = await Promise.all([
    getSalesQuery(),
    getProductsQuery(),
    getCatalogSettings(),
  ]);

  const saleProducts = products
    .filter((product) => !product.archivedAt && product.stock > 0)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
    }));

  return (
    <SalesPanel
      paymentFeeRules={settings.paymentFeeRules}
      saleProducts={saleProducts}
      sales={sales}
    />
  );
}
