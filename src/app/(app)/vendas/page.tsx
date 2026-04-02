import type { Metadata } from "next";
import { SalesPanel } from "@/components/sales/sales-panel";
import { getProductsQuery } from "../produtos/queries";
import { getSalesQuery } from "./queries";

export const metadata: Metadata = {
  title: "Vendas | DG Imports",
  description: "Registro, consulta e cancelamento de vendas do DG Imports.",
};

export default async function VendasPage() {
  const [sales, products] = await Promise.all([
    getSalesQuery(),
    getProductsQuery(),
  ]);

  const saleProducts = products
    .filter((product) => !product.archivedAt && product.stock > 0)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
    }));

  return <SalesPanel saleProducts={saleProducts} sales={sales} />;
}
