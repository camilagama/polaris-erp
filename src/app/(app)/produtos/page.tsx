import { ProductsPanel } from "@/components/products/products-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getProductStockEntriesAction, getProductsAction } from "./actions";

export default async function ProdutosPage() {
  const [products, categories, settings, stockEntries] = await Promise.all([
    getProductsAction(),
    listCategoriesWithUsage(),
    getCatalogSettings(),
    getProductStockEntriesAction(),
  ]);

  return (
    <ProductsPanel
      categories={categories.map((category) => ({
        id: category.id,
        key: category.key,
        name: category.name,
      }))}
      products={products}
      settings={settings}
      stockEntries={stockEntries}
    />
  );
}
