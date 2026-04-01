import type { Metadata } from "next";
import { ProductsPanel } from "@/components/products/products-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getProductsQuery } from "./queries";

export const metadata: Metadata = {
  title: "Produtos | DG Imports",
  description: "Catalogo, estoque atual e operacoes de produto do DG Imports.",
};

export default async function ProdutosPage() {
  const [products, categories, settings] = await Promise.all([
    getProductsQuery(),
    listCategoriesWithUsage(),
    getCatalogSettings(),
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
    />
  );
}
