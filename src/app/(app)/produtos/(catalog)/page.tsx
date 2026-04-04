import type { Metadata } from "next";
import { ProductsPanel } from "@/components/products/products-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getProductAnalytics } from "@/features/products/server";
import { getProductsQuery } from "../queries";

export const metadata: Metadata = {
  title: "Produtos | DG Imports",
  description: "Catalogo, estoque atual e operacoes de produto do DG Imports.",
};

export default async function ProdutosPage(props: PageProps<"/produtos">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = searchParams.status === "archived" ? "archived" : "active";
  const [productsResult, categories, settings, analytics] = await Promise.all([
    getProductsQuery({
      query,
      status,
    }),
    listCategoriesWithUsage(),
    getCatalogSettings(),
    getProductAnalytics(),
  ]);

  return (
    <ProductsPanel
      analytics={analytics}
      appliedQuery={query}
      categories={categories.map((category) => ({
        id: category.id,
        key: category.key,
        name: category.name,
      }))}
      initialCursor={productsResult.nextCursor}
      products={productsResult.items}
      settings={settings}
      status={status}
    />
  );
}
