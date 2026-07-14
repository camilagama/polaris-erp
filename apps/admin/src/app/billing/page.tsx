import { getPlatformBillingOverviewForAdmin } from "@polaris/platform/billing";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { changeBillingSubscriptionStatusAction } from "./actions";

const guardPlatformAdmin = async () => {
  try {
    return await requirePlatformAdmin();
  } catch {
    forbidden();
  }
};

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const formatTenantLabel = ({
  billingEmail,
  organizationId,
}: {
  billingEmail: string | null;
  organizationId: string;
}) => billingEmail ?? organizationId;

const BillingContent = async () => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const overview = await getPlatformBillingOverviewForAdmin(
    platformAdmin.platformAdminId
  );

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div>
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          Voltar
        </Link>
        <h1 className="mt-2 font-semibold text-2xl tracking-normal">Billing</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Estado canonico de assinaturas, invoices e acesso derivado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
            Assinaturas
          </h2>
          <p className="mt-3 font-semibold text-3xl tracking-normal">
            {overview.totals.subscriptions}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
            Com acesso
          </h2>
          <p className="mt-3 font-semibold text-3xl tracking-normal">
            {overview.totals.activeAccessSubscriptions}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
            Invoices abertas
          </h2>
          <p className="mt-3 font-semibold text-3xl tracking-normal">
            {overview.totals.openInvoices}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-normal">
            Assinaturas recentes
          </h2>
        </div>
        {overview.subscriptions.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhuma assinatura registrada.
          </p>
        ) : (
          overview.subscriptions.map((subscription) => (
            <div
              className="grid gap-3 border-border border-b px-4 py-3 text-sm md:grid-cols-[1fr_0.6fr_0.6fr_0.7fr_1.3fr]"
              key={subscription.organizationId}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {formatTenantLabel(subscription)}
                </span>
                <span className="block truncate text-muted-foreground">
                  {subscription.organizationId} · {subscription.planName}
                </span>
              </span>
              <span className="text-foreground">{subscription.status}</span>
              <span
                className={
                  subscription.hasAccess
                    ? "font-medium text-emerald-300"
                    : "font-medium text-amber-300"
                }
              >
                {subscription.hasAccess ? "Acesso ativo" : "Sem acesso"}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(subscription.currentPeriodEnd)}
              </span>
              <form
                action={changeBillingSubscriptionStatusAction}
                className="grid gap-2"
              >
                <input
                  name="subscriptionId"
                  type="hidden"
                  value={subscription.subscriptionId}
                />
                <input
                  name="status"
                  type="hidden"
                  value={subscription.hasAccess ? "past_due" : "active"}
                />
                <input
                  aria-label="Motivo da alteracao de billing"
                  className="min-h-9 rounded-md border border-border bg-background px-3 text-foreground text-xs outline-none placeholder:text-muted-foreground"
                  name="reason"
                  placeholder={
                    subscription.hasAccess
                      ? "Motivo para bloquear"
                      : "Motivo para ativar"
                  }
                  required
                />
                {!subscription.hasAccess && (
                  <input
                    aria-label="Referencia da evidencia de pagamento"
                    className="min-h-9 rounded-md border border-border bg-background px-3 text-foreground text-xs outline-none placeholder:text-muted-foreground"
                    name="paymentEvidenceReference"
                    placeholder="Referencia do pagamento"
                    required
                  />
                )}
                <label className="flex items-center gap-2 text-muted-foreground text-xs">
                  <input
                    className="size-3"
                    name="confirm"
                    required
                    type="checkbox"
                  />
                  Confirmo a alteracao manual
                </label>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-border px-3 font-medium text-foreground text-xs hover:bg-muted"
                  type="submit"
                >
                  {subscription.hasAccess ? "Bloquear acesso" : "Ativar acesso"}
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-normal">
            Invoices recentes
          </h2>
        </div>
        {overview.invoices.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhuma invoice registrada.
          </p>
        ) : (
          overview.invoices.map((invoice) => (
            <div
              className="grid gap-3 border-border border-b px-4 py-3 text-sm md:grid-cols-[1fr_0.7fr_0.7fr_0.7fr]"
              key={`${invoice.organizationId}-${invoice.createdAt}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {formatTenantLabel(invoice)}
                </span>
                <span className="block truncate text-muted-foreground">
                  {invoice.organizationId}
                </span>
              </span>
              <span className="text-foreground">{invoice.status}</span>
              <span className="text-foreground">
                {formatMoney(invoice.totalCents)}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(invoice.createdAt)}
              </span>
            </div>
          ))
        )}
      </section>
    </section>
  );
};

const BillingFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-muted-foreground text-sm">Carregando billing...</p>
  </section>
);

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<BillingFallback />}>
        <BillingContent />
      </Suspense>
    </main>
  );
}
