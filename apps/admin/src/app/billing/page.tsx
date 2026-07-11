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

const BillingContent = async () => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const overview = await getPlatformBillingOverviewForAdmin(
    platformAdmin.platformAdminId
  );

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div>
        <Link className="text-sm text-zinc-500 hover:text-zinc-200" href="/">
          Voltar
        </Link>
        <h1 className="mt-2 font-semibold text-2xl tracking-normal">Billing</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Estado canonico de assinaturas, invoices e acesso derivado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium text-sm text-zinc-400 tracking-normal">
            Assinaturas
          </h2>
          <p className="mt-3 font-semibold text-3xl tracking-normal">
            {overview.totals.subscriptions}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium text-sm text-zinc-400 tracking-normal">
            Com acesso
          </h2>
          <p className="mt-3 font-semibold text-3xl tracking-normal">
            {overview.totals.activeAccessSubscriptions}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium text-sm text-zinc-400 tracking-normal">
            Invoices abertas
          </h2>
          <p className="mt-3 font-semibold text-3xl tracking-normal">
            {overview.totals.openInvoices}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-zinc-800 border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-normal">
            Assinaturas recentes
          </h2>
        </div>
        {overview.subscriptions.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">
            Nenhuma assinatura registrada.
          </p>
        ) : (
          overview.subscriptions.map((subscription) => (
            <div
              className="grid gap-3 border-zinc-800 border-b px-4 py-3 text-sm md:grid-cols-[1fr_0.6fr_0.6fr_0.7fr_1.3fr]"
              key={subscription.organizationId}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-100">
                  {subscription.organizationName}
                </span>
                <span className="block truncate text-zinc-500">
                  {subscription.planName}
                </span>
              </span>
              <span className="text-zinc-300">{subscription.status}</span>
              <span
                className={
                  subscription.hasAccess
                    ? "font-medium text-emerald-300"
                    : "font-medium text-amber-300"
                }
              >
                {subscription.hasAccess ? "Acesso ativo" : "Sem acesso"}
              </span>
              <span className="text-zinc-400">
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
                  className="min-h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
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
                    className="min-h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
                    name="paymentEvidenceReference"
                    placeholder="Referencia do pagamento"
                    required
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  <input
                    className="size-3"
                    name="confirm"
                    required
                    type="checkbox"
                  />
                  Confirmo a alteracao manual
                </label>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-700 px-3 font-medium text-xs text-zinc-100 hover:bg-zinc-800"
                  type="submit"
                >
                  {subscription.hasAccess ? "Bloquear acesso" : "Ativar acesso"}
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-zinc-800 border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-normal">
            Invoices recentes
          </h2>
        </div>
        {overview.invoices.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">
            Nenhuma invoice registrada.
          </p>
        ) : (
          overview.invoices.map((invoice) => (
            <div
              className="grid gap-3 border-zinc-800 border-b px-4 py-3 text-sm md:grid-cols-[1fr_0.7fr_0.7fr_0.7fr]"
              key={`${invoice.organizationName}-${invoice.createdAt}`}
            >
              <span className="font-medium text-zinc-100">
                {invoice.organizationName}
              </span>
              <span className="text-zinc-300">{invoice.status}</span>
              <span className="text-zinc-300">
                {formatMoney(invoice.totalCents)}
              </span>
              <span className="text-zinc-400">
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
    <p className="text-sm text-zinc-500">Carregando billing...</p>
  </section>
);

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<BillingFallback />}>
        <BillingContent />
      </Suspense>
    </main>
  );
}
