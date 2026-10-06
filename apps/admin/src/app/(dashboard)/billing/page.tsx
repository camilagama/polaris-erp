import { Invoice01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { getPlatformBillingOverviewForAdmin } from "@polaris/platform/billing";
import { PageHeader } from "@polaris/ui/components/shared/page-header";
import {
  BusinessTimeZoneNotice,
  TimeValue,
} from "@polaris/ui/components/shared/time-value";
import { Button } from "@polaris/ui/components/ui/button";
import { Empty } from "@polaris/ui/components/ui/empty";
import { Input } from "@polaris/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polaris/ui/components/ui/table";
import { formatCurrency } from "@polaris/ui/lib/formatters";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { changeBillingSubscriptionStatusAction } from "./actions";

const guardPlatformAdmin = async () => requirePlatformAdmin();

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
    <section className="grid gap-6">
      <PageHeader
        backLink={{ href: "/" }}
        description="Estado canonico de assinaturas, invoices e acesso derivado."
        title="Billing"
      />
      <BusinessTimeZoneNotice />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
            Assinaturas
          </h2>
          <p className="mt-2 font-semibold text-3xl tracking-tight">
            {overview.totals.subscriptions}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
            Com acesso
          </h2>
          <p className="mt-2 font-semibold text-3xl tracking-tight">
            {overview.totals.activeAccessSubscriptions}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
            Invoices abertas
          </h2>
          <p className="mt-2 font-semibold text-3xl tracking-tight">
            {overview.totals.openInvoices}
          </p>
        </div>
      </div>

      <section className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-tight">
            Assinaturas recentes
          </h2>
        </div>
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead>Período Final</TableHead>
              <TableHead className="pr-4 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overview.subscriptions.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="h-48 text-center" colSpan={5}>
                  <Empty
                    className="border-none shadow-none"
                    description="Nenhuma assinatura registrada na plataforma."
                    icon={UserGroupIcon}
                    title="Nenhuma assinatura"
                  />
                </TableCell>
              </TableRow>
            ) : (
              overview.subscriptions.map((subscription) => (
                <TableRow
                  className="transition-colors"
                  key={subscription.organizationId}
                >
                  <TableCell className="pl-4">
                    <span className="block truncate font-medium text-foreground">
                      {formatTenantLabel(subscription)}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {subscription.organizationId} · {subscription.planName}
                    </span>
                  </TableCell>
                  <TableCell>{subscription.status}</TableCell>
                  <TableCell>
                    <span
                      className={
                        subscription.hasAccess
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "font-medium text-amber-600 dark:text-amber-400"
                      }
                    >
                      {subscription.hasAccess ? "Acesso ativo" : "Sem acesso"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <TimeValue
                      kind="instant"
                      value={subscription.currentPeriodEnd}
                    />
                  </TableCell>
                  <TableCell className="pr-4 align-top">
                    <form
                      action={changeBillingSubscriptionStatusAction}
                      className="flex flex-col items-end gap-2"
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
                      <div className="flex w-full max-w-[260px] flex-col gap-2">
                        <Input
                          aria-label="Motivo da alteracao de billing"
                          className="h-8 text-xs"
                          name="reason"
                          placeholder={
                            subscription.hasAccess
                              ? "Motivo para bloquear"
                              : "Motivo para ativar"
                          }
                          required
                        />
                        {!subscription.hasAccess && (
                          <Input
                            aria-label="Referencia da evidencia de pagamento"
                            className="h-8 text-xs"
                            name="paymentEvidenceReference"
                            placeholder="Referencia do pagamento"
                            required
                          />
                        )}
                        <label className="flex items-center gap-2 self-end text-muted-foreground text-xs">
                          <input
                            className="size-3"
                            name="confirm"
                            required
                            type="checkbox"
                          />
                          Confirmo alteração
                        </label>
                        <Button
                          className="self-end"
                          size="sm"
                          type="submit"
                          variant="secondary"
                        >
                          {subscription.hasAccess
                            ? "Bloquear acesso"
                            : "Ativar acesso"}
                        </Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-tight">
            Invoices recentes
          </h2>
        </div>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="pr-4 text-right">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overview.invoices.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="h-48 text-center" colSpan={4}>
                  <Empty
                    className="border-none shadow-none"
                    description="Nenhuma invoice registrada."
                    icon={Invoice01Icon}
                    title="Nenhuma invoice"
                  />
                </TableCell>
              </TableRow>
            ) : (
              overview.invoices.map((invoice) => (
                <TableRow
                  className="transition-colors"
                  key={`${invoice.organizationId}-${invoice.createdAt}`}
                >
                  <TableCell className="pl-4">
                    <span className="block truncate font-medium text-foreground">
                      {formatTenantLabel(invoice)}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {invoice.organizationId}
                    </span>
                  </TableCell>
                  <TableCell>{invoice.status}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.totalCents / 100)}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">
                    <TimeValue kind="instant" value={invoice.createdAt} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </section>
  );
};

const BillingFallback = () => (
  <section>
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
