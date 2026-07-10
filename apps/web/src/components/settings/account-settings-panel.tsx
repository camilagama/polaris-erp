import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AccountBillingSummary } from "@/features/account/server";
import type { OrganizationRole } from "@/lib/app-context";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

interface AccountSettingsPanelProps {
  billing: AccountBillingSummary;
  user: {
    email: string;
    name: string;
    role: OrganizationRole;
  };
  workspaceName: string;
}

const roleLabel: Record<OrganizationRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  owner: "Responsavel",
};

const billingStatusLabel: Record<
  NonNullable<AccountBillingSummary["status"]>,
  string
> = {
  active: "Ativa",
  canceled: "Cancelada",
  incomplete: "Pendente",
  past_due: "Pagamento pendente",
  paused: "Pausada",
  trialing: "Periodo de teste",
};

const intervalLabel = (interval: string | null): string => {
  switch (interval) {
    case "month": {
      return "mensal";
    }
    case "year": {
      return "anual";
    }
    default: {
      return "periodo nao definido";
    }
  }
};

const getBillingStatusLabel = (
  status: AccountBillingSummary["status"]
): string => (status ? billingStatusLabel[status] : "Nao configurada");

const getPlanLine = (billing: AccountBillingSummary): string => {
  if (!billing.planName || billing.amountCents === null) {
    return "Plano ainda nao associado a esta conta.";
  }

  return `${billing.planName} - ${formatCurrency(billing.amountCents / 100)} / ${intervalLabel(billing.interval)}`;
};

export function AccountSettingsPanel({
  billing,
  user,
  workspaceName,
}: AccountSettingsPanelProps) {
  const renewalText = billing.currentPeriodEnd
    ? formatDateTime(billing.currentPeriodEnd)
    : "Data nao definida";

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Minha conta</CardTitle>
        <CardDescription>
          Dados essenciais do acesso atual, assinatura e caminhos operacionais.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <section className="flex min-h-32 flex-col justify-between rounded-lg border border-border/60 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-sm">Acesso</h2>
            <p className="text-muted-foreground text-xs">
              Usuario autenticado nesta operacao.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <p className="truncate font-semibold text-sm">{workspaceName}</p>
            <p className="truncate font-semibold text-sm">{user.name}</p>
            <p className="truncate text-muted-foreground text-xs">
              {user.email}
            </p>
            <p className="text-muted-foreground text-xs">
              Perfil: {roleLabel[user.role]}
            </p>
          </div>
        </section>

        <section className="flex min-h-32 flex-col justify-between rounded-lg border border-border/60 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-sm">Assinatura</h2>
            <p className="text-muted-foreground text-xs">
              Cobranca obrigatoria desde o primeiro dia.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <p className="font-semibold text-sm">
              {getBillingStatusLabel(billing.status)}
            </p>
            <p className="text-muted-foreground text-xs">
              {getPlanLine(billing)}
            </p>
            <p className="text-muted-foreground text-xs">
              {billing.cancelAtPeriodEnd
                ? `Cancela no fim do periodo: ${renewalText}`
                : `Proximo ciclo: ${renewalText}`}
            </p>
          </div>
        </section>

        <section className="flex min-h-32 flex-col justify-between rounded-lg border border-border/60 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-sm">Suporte e dados</h2>
            <p className="text-muted-foreground text-xs">
              Pedidos sensiveis continuam por atendimento humano.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-muted-foreground text-xs">
            <p>Email de cobranca: {billing.billingEmail ?? user.email}</p>
            <p>Para exportacao ou exclusao, solicite pelo canal de suporte.</p>
            <p>Convites multiusuario permanecem fora do escopo do MVP.</p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
