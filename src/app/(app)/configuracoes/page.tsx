import type { Metadata } from "next";
import { connection } from "next/server";
import { CatalogSettingsPanel } from "@/components/settings/catalog-settings-panel";
import { GoalsSettingsPanel } from "@/components/settings/goals-settings-panel";
import { MembersSettingsPanel } from "@/components/settings/members-settings-panel";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getDashboardDateBounds } from "@/features/dashboard/server";
import { getGoalsSettingsData } from "@/features/goals/server";
import {
  listOrganizationInvitations,
  listOrganizationMembers,
} from "@/features/organization/server";
import { requireAppContext } from "@/lib/app-session";

export const metadata: Metadata = {
  title: "Configuracoes | DG Imports",
  description: "Categorias, markup, metas e regras operacionais de pagamento.",
};

export default async function ConfiguracoesPage() {
  await connection();
  const context = await requireAppContext("settings:write");
  const [categories, settings, dateBounds, goalsPayload, members, invitations] =
    await Promise.all([
      listCategoriesWithUsage(context.organizationId),
      getCatalogSettings(context.organizationId),
      getDashboardDateBounds(context.organizationId),
      getGoalsSettingsData(context.organizationId),
      listOrganizationMembers(context.organizationId),
      listOrganizationInvitations(context.organizationId),
    ]);

  return (
    <div className="flex flex-col gap-6 px-6 pb-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Configuracoes</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Ajuste categorias, precificacao, metas do negocio e regras de
          parcelamento sem depender do fluxo de cadastro de produtos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalsSettingsPanel dateBounds={dateBounds} payload={goalsPayload} />
        <CatalogSettingsPanel categories={categories} settings={settings} />
        <MembersSettingsPanel invitations={invitations} members={members} />
      </div>
    </div>
  );
}
