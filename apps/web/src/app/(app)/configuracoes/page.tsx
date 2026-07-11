import type { Metadata } from "next";
import { connection } from "next/server";
import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";
import { CatalogSettingsPanel } from "@/components/settings/catalog-settings-panel";
import { GoalsSettingsPanel } from "@/components/settings/goals-settings-panel";
import { getAccountBillingSummary } from "@/features/account/server";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getDashboardDateBounds } from "@/features/dashboard/server";
import { getGoalsSettingsData } from "@/features/goals/server";
import { requireAppContext } from "@/lib/app-session";
import { serverEnv } from "@/lib/env";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Configuracoes | Polaris",
  description:
    "Conta, assinatura, categorias, markup, metas e regras operacionais de pagamento.",
};

export default async function ConfiguracoesPage() {
  await connection();
  const [context, session] = await Promise.all([
    requireAppContext("settings:write"),
    requireSession(),
  ]);
  const [accountBilling, categories, settings, dateBounds, goalsPayload] =
    await Promise.all([
      getAccountBillingSummary(context.organizationId),
      listCategoriesWithUsage(context.organizationId),
      getCatalogSettings(context.organizationId),
      getDashboardDateBounds(context.organizationId),
      getGoalsSettingsData(context.organizationId),
    ]);

  return (
    <div className="flex flex-col gap-6 px-6 pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">Configuracoes</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Revise acesso, assinatura, categorias, precificacao, metas do negocio
          e regras de parcelamento sem depender do fluxo de cadastro de
          produtos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountSettingsPanel
          billing={accountBilling}
          supportEmail={serverEnv.SUPPORT_EMAIL}
          user={{
            email: session.user.email,
            name: session.user.name,
            role: context.role,
          }}
          workspaceName={context.organizationName}
        />
        <GoalsSettingsPanel dateBounds={dateBounds} payload={goalsPayload} />
        <CatalogSettingsPanel categories={categories} settings={settings} />
      </div>
    </div>
  );
}
