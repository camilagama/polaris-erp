import { getProductsAction } from "@/app/(app)/produtos/actions";
import { SalesPanel } from "@/components/sales/sales-panel";
import { getCatalogSettings } from "@/features/catalog/server";
import { getSalesAction } from "./actions";

export default async function VendasPage() {
  const [sales, products, settings] = await Promise.all([
    getSalesAction(),
    getProductsAction(),
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
