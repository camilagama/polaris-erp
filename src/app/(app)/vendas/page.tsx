import { getProductsAction } from "@/app/(app)/produtos/actions";
import { SalesPanel } from "@/components/sales/sales-panel";
import { getSalesAction } from "./actions";

export default async function VendasPage() {
  const [sales, products] = await Promise.all([
    getSalesAction(),
    getProductsAction(),
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
