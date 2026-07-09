import { getPlatformDashboardData } from "@polaris/platform/dashboard";
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
  const dashboard = await getPlatformDashboardData();
  const summaryCards = [
    {
      label: "Organizacoes",
      value: dashboard.summary.organizations,
      detail: `${formatNumber(dashboard.summary.activeOrganizations)} ativas`,
      href: "/organizations",
    },
    {
      label: "Usuarios",
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

  return (
    <>
      <section className="border-zinc-800 border-b bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-medium text-emerald-300 text-sm">
              Polaris Platform
            </p>
            <h1 className="mt-1 font-semibold text-2xl tracking-normal">
              Admin interno
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Acesso verificado</p>
            <p className="font-medium text-sm text-zinc-100">{context.role}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg tracking-normal">
                Console operacional
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Superficie interna bloqueada por Cloudflare Access, sessao
                Better Auth e grant ativo de platform admin.
              </p>
            </div>
            <div className="rounded-md border border-zinc-700 px-3 py-2 text-sm">
              <span className="text-zinc-400">Admin ID </span>
              <span className="font-mono text-zinc-100">
                {context.platformAdminId.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map((card) => (
            <Link
              aria-disabled={!card.href}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80"
              href={card.href ?? "/"}
              key={card.label}
              prefetch={false}
            >
              <h2 className="font-medium text-sm text-zinc-400 tracking-normal">
                {card.label}
              </h2>
              <p className="mt-3 font-semibold text-3xl tracking-normal">
                {formatNumber(card.value)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{card.detail}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-semibold text-lg tracking-normal">
              Status operacional
            </h2>
            <div className="mt-5 grid gap-3">
              {healthCards.map((card) => (
                <div
                  className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2"
                  key={card.label}
                >
                  <span className="text-sm text-zinc-300">{card.label}</span>
                  <span
                    className={
                      card.ok
                        ? "font-medium text-emerald-300 text-sm"
                        : "font-medium text-amber-300 text-sm"
                    }
                  >
                    {getHealthLabel(card.ok)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-semibold text-lg tracking-normal">
              Eventos recentes
            </h2>
            <div className="mt-5 grid gap-3">
              {dashboard.events.length === 0 ? (
                <p className="rounded-md border border-zinc-800 px-3 py-4 text-sm text-zinc-500">
                  Nenhum evento recente para exibir.
                </p>
              ) : (
                dashboard.events.map((event) => (
                  <div
                    className="grid gap-1 rounded-md border border-zinc-800 px-3 py-2"
                    key={`${event.source}-${event.label}-${event.occurredAt}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-sm text-zinc-200">
                        {event.label}
                      </span>
                      <span className="font-mono text-xs text-zinc-500">
                        {formatEventDate(event.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {event.source === "tenant" ? "Tenant" : "Platform"}
                      {event.count
                        ? ` · ${formatNumber(event.count)} eventos`
                        : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </>
  );
};

const AdminDashboardFallback = () => (
  <section className="border-zinc-800 border-b bg-zinc-950">
    <div className="mx-auto w-full max-w-6xl px-6 py-5">
      <p className="font-medium text-emerald-300 text-sm">Polaris Platform</p>
      <h1 className="mt-1 font-semibold text-2xl tracking-normal">
        Admin interno
      </h1>
    </div>
  </section>
);

export default function AdminRootPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<AdminDashboardFallback />}>
        <AdminDashboard />
      </Suspense>
    </main>
  );
}
