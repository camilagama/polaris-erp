import { getPlatformDashboardDataForAdmin } from "@polaris/platform/dashboard";
import {
  AlertBanner,
  type AlertBannerMessage,
} from "@polaris/ui/components/shared/alert-banner";
import {
  BusinessTimeZoneNotice,
  TimeValue,
} from "@polaris/ui/components/shared/time-value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polaris/ui/components/ui/card";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { ActivityGraph } from "./activity-graph";
import { AdminDashboardSkeleton } from "./admin-dashboard-skeleton";

const getAdminContext = async () => requirePlatformAdmin();

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);

const getHealthLabel = (isHealthy: boolean) =>
  isHealthy ? "Operacional" : "Pendente";

const AdminDashboard = async () => {
  await connection();

  const context = await getAdminContext();
  const dashboard = await getPlatformDashboardDataForAdmin(
    context.platformAdminId
  );
  const summaryCards = [
    {
      label: "Organizações",
      value: dashboard.summary.organizations,
      detail: `${formatNumber(dashboard.summary.activeOrganizations)} ativas`,
      href: "/organizations",
    },
    {
      label: "Usuários",
      value: dashboard.summary.users,
      detail: `${formatNumber(dashboard.summary.members)} memberships`,
      href: "/users",
    },
    {
      label: "Admins internos",
      value: dashboard.summary.platformAdmins,
      detail: `${formatNumber(dashboard.summary.disabledPlatformAdmins)} desativados`,
      href: context.role === "owner" ? "/admin-access" : null,
    },
    {
      label: "Auditoria",
      value: dashboard.events.length,
      detail: "eventos recentes",
      href: "/audit",
    },
    {
      label: "Eventos",
      value: dashboard.events.length,
      detail: "outbox e webhooks",
      href: "/events",
    },
    {
      label: "Billing",
      value: 0,
      detail: "assinaturas e invoices",
      href: "/billing",
    },
  ] as const;

  const healthCards = [
    {
      label: "Database",
      ok: dashboard.health.database,
    },
    {
      label: "R2",
      ok: dashboard.health.r2,
    },
    {
      label: "Reconcile",
      ok: dashboard.health.productImageReconcileSecret,
    },
  ] as const;

  const alerts: AlertBannerMessage[] = [];
  if (!dashboard.health.database) {
    alerts.push({
      id: "health-db",
      message: "Falha de comunicação com o Banco de Dados.",
      severity: "negative",
    });
  }
  if (!dashboard.health.r2) {
    alerts.push({
      id: "health-r2",
      message: "Credenciais do R2 ausentes ou inválidas.",
      severity: "negative",
    });
  }

  return (
    <section className="grid gap-6">
      <AlertBanner alerts={alerts} />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <h1 className="font-heading font-medium text-lg">
              Console operacional
            </h1>
            <CardDescription className="mt-2 max-w-2xl">
              Superfície interna bloqueada por Vercel Authentication, sessão
              Better Auth e grant ativo de platform admin.
            </CardDescription>
          </div>
          <div className="rounded-md border border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Admin ID </span>
            <span className="font-mono text-foreground">
              {context.platformAdminId.slice(0, 8)}
            </span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => {
          const cardContent = (
            <CardContent className="p-4">
              <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
                {card.label}
              </h2>
              <p className="mt-3 font-semibold text-3xl tracking-normal">
                {formatNumber(card.value)}
              </p>
              <p className="mt-2 text-muted-foreground text-sm">
                {card.detail}
              </p>
            </CardContent>
          );

          return card.href ? (
            <Link
              className="group block"
              href={card.href}
              key={card.label}
              prefetch={false}
            >
              <Card className="transition-all hover:border-muted-foreground/30 active:scale-[0.98]">
                {cardContent}
              </Card>
            </Link>
          ) : (
            <article className="opacity-70" key={card.label}>
              <Card>{cardContent}</Card>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade do Sistema</CardTitle>
            <CardDescription>
              Volume de eventos de auditoria registrados (Tenant + Platform)
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="w-full">
              <ActivityGraph data={dashboard.activity} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status operacional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {healthCards.map((card) => (
              <div
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/30"
                key={card.label}
              >
                <span className="text-foreground/80 text-sm">{card.label}</span>
                <span
                  className={
                    card.ok
                      ? "font-medium text-emerald-700 text-sm dark:text-emerald-400"
                      : "font-medium text-amber-700 text-sm dark:text-amber-300"
                  }
                >
                  {getHealthLabel(card.ok)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eventos recentes</CardTitle>
            <BusinessTimeZoneNotice />
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboard.events.length === 0 ? (
              <p className="rounded-md border border-border px-3 py-4 text-muted-foreground text-sm">
                Nenhum evento recente para exibir.
              </p>
            ) : (
              dashboard.events.map((event) => (
                <div
                  className="grid gap-1 rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/30"
                  key={`${event.source}-${event.label}-${event.occurredAt}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground text-sm">
                      {event.label}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      <TimeValue kind="instant" value={event.occurredAt} />
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {event.source === "tenant" ? "Tenant" : "Platform"}
                    {event.count
                      ? ` · ${formatNumber(event.count)} eventos`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default function AdminRootPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
