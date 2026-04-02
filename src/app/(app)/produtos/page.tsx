import type { Metadata } from "next";
import { ProductsPanel } from "@/components/products/products-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getProductAnalytics } from "@/features/products/server";
import { getProductsQuery } from "./queries";

export const metadata: Metadata = {
  title: "Produtos | DG Imports",
  description: "Catalogo, estoque atual e operacoes de produto do DG Imports.",
};

export default async function ProdutosPage() {
  const [productsResult, categories, settings, analytics] = await Promise.all([
    getProductsQuery(),
    listCategoriesWithUsage(),
    getCatalogSettings(),
    getProductAnalytics(),
  ]);

  return (
    <ProductsPanel
      analytics={analytics}
      categories={categories.map((category) => ({
        id: category.id,
        key: category.key,
        name: category.name,
      }))}
      products={productsResult.items}
      settings={settings}
    />
  );
}
