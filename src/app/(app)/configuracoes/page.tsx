import type { Metadata } from "next";
import { CatalogSettingsPanel } from "@/components/settings/catalog-settings-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";

export const metadata: Metadata = {
  title: "Configuracoes | DG Imports",
  description: "Categorias, markup e regras operacionais de pagamento.",
};

export default async function ConfiguracoesPage() {
  const [categories, settings] = await Promise.all([
    listCategoriesWithUsage(),
    getCatalogSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Configuracoes</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Ajuste categorias, precificacao e regras de parcelamento sem depender
          do fluxo de cadastro de produtos.
        </p>
      </div>

      <CatalogSettingsPanel categories={categories} settings={settings} />
    </div>
  );
}
