import type { Metadata } from "next";
import { ProductsPanel } from "@/components/products/products-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getProductsQuery } from "@/features/products/queries";
import { getProductAnalytics } from "@/features/products/server";
import { requirePageAppContext } from "@/lib/app-session";

export const metadata: Metadata = {
  title: "Produtos | Polaris",
  description: "Catalogo, estoque atual e operacoes de produto do Polaris.",
};

export default async function ProdutosPage(props: PageProps<"/produtos">) {
  const context = await requirePageAppContext();
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = searchParams.status === "archived" ? "archived" : "active";
  const productsResult = await getProductsQuery({
    organizationId: context.organizationId,
    query,
    status,
  });
  const categories = await listCategoriesWithUsage(context.organizationId);
  const settings = await getCatalogSettings(context.organizationId);
  const analytics = await getProductAnalytics({
    organizationId: context.organizationId,
  });

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
      role={context.role}
      settings={settings}
      status={status}
    />
  );
}
