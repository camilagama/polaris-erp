import { getPlatformDashboardDataForAdmin } from "@polaris/platform/dashboard";
import { RevenueProfitChart } from "@polaris/ui/components/shared/revenue-profit-chart";
import { SalesCountChart } from "@polaris/ui/components/shared/sales-count-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polaris/ui/components/ui/card";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

const getAdminContext = async () => {
  try {
    return await requirePlatformAdmin();
  } catch {
    forbidden();
  }
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);

const formatEventDate = (value: string | null) => {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
};

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
      href: null,
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

  const mockChartData = [
    { label: "Seg", salesCount: 12, costs: 0, result: 0, sold: 0 },
    { label: "Ter", salesCount: 15, costs: 0, result: 0, sold: 0 },
    { label: "Qua", salesCount: 18, costs: 0, result: 0, sold: 0 },
    { label: "Qui", salesCount: 22, costs: 0, result: 0, sold: 0 },
    { label: "Sex", salesCount: 28, costs: 0, result: 0, sold: 0 },
    { label: "Sáb", salesCount: 25, costs: 0, result: 0, sold: 0 },
    { label: "Dom", salesCount: 30, costs: 0, result: 0, sold: 0 },
  ];

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">Console operacional</CardTitle>
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
            <Card className="opacity-70" key={card.label}>
              {cardContent}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_1fr]">
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
                      ? "font-medium text-emerald-500 text-sm"
                      : "font-medium text-amber-500 text-sm"
                  }
                >
                  {getHealthLabel(card.ok)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eventos recentes</CardTitle>
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
                      {formatEventDate(event.occurredAt)}
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

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Desempenho Geral</CardTitle>
            <CardDescription>
              Métricas de atividade da plataforma (Exemplo Abstraído)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between">
            <div className="mb-4 min-h-[140px] w-full flex-1">
              <SalesCountChart data={mockChartData} />
            </div>
            <RevenueProfitChart profit={12_000} revenue={45_000} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

const AdminDashboardFallback = () => <div className="flex-1" />;

export default function AdminRootPage() {
  return (
    <Suspense fallback={<AdminDashboardFallback />}>
      <AdminDashboard />
    </Suspense>
  );
}
