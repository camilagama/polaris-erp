import type { Metadata } from "next";
import Link from "next/link";
import { InventoryCategoriesChart } from "@/components/dashboard/inventory-categories-chart";
import { RevenueResultChart } from "@/components/dashboard/revenue-result-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardMetrics } from "@/features/dashboard/server";
import { formatCurrency } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | DG Imports",
  description: "Painel inicial da operacao protegida do DG Imports.",
};

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  let resultBadge: {
    label: string;
    variant: "destructive" | "outline" | "secondary";
  };
  let resultLabel = "Resultado do mes";
  let resultSummary = "Vendas e custos ficaram equilibrados.";

  if (metrics.resultStatus === "profit") {
    resultBadge = {
      label: "Lucro",
      variant: "secondary",
    };
    resultLabel = "Lucro do mes";
    resultSummary = "As vendas ficaram acima dos custos.";
  } else if (metrics.resultStatus === "loss") {
    resultBadge = {
      label: "Prejuizo",
      variant: "destructive",
    };
    resultLabel = "Prejuizo do mes";
    resultSummary = "Os custos ficaram acima das vendas.";
  } else {
    resultBadge = {
      label: "Empatado",
      variant: "outline",
    };
  }

  const summaryCards = [
    {
      label: "Total vendido",
      note: metrics.referenceMonthLabel,
      value: formatCurrency(metrics.monthlySold),
    },
    {
      badge: resultBadge,
      label: resultLabel,
      note: `Venda menos custos em ${metrics.referenceMonthLabel}`,
      value: formatCurrency(metrics.monthlyResult),
    },
    {
      label: "Custos do mes",
      note: `Produtos, frete e taxas em ${metrics.referenceMonthLabel}`,
      value: formatCurrency(metrics.monthlyCosts),
    },
    {
      label: "Vendas concluidas",
      note: `Total de vendas em ${metrics.referenceMonthLabel}`,
      value: `${metrics.monthlySalesCount}`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
            Painel operacional
          </p>
          <h1 className="font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
            Indicadores essenciais da operacao
          </h1>
          <p className="max-w-3xl text-muted-foreground text-sm leading-6">
            O painel mostra apenas o que mais ajuda na leitura rapida do
            negocio: quanto foi cobrado nas vendas, quanto saiu em custos, qual
            foi o resultado final e quais produtos mais giraram.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/vendas">Registrar venda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/produtos">Ver produtos</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/configuracoes">Ajustar regras</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  {card.label}
                </CardTitle>
                {card.badge ? (
                  <Badge variant={card.badge.variant}>{card.badge.label}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <strong className="font-heading text-3xl tracking-tight">
                {card.value}
              </strong>
              <span className="font-mono text-muted-foreground text-xs">
                {card.note}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Vendas e custos por mes</CardTitle>
            <CardDescription>
              Compare o total cobrado nas vendas com o total que saiu em custos
              em cada mes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueResultChart data={metrics.monthlyComparison} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">Produtos mais vendidos</CardTitle>
              <CardDescription>
                Ranking do mes atual por quantidade vendida.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopProductsChart data={metrics.topProducts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">Categorias no estoque</CardTitle>
              <CardDescription>
                Participacao do valor imobilizado atual por categoria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryCategoriesChart data={metrics.inventoryByCategory} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Resumo rapido do mes</CardTitle>
          <CardDescription>
            Leitura simples para o usuario final entender o momento atual do
            negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-4">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Situacao do mes
            </p>
            <p className="mt-2 font-semibold text-base">{resultSummary}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-4">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Produto em destaque
            </p>
            <p className="mt-2 font-semibold text-base">
              {metrics.topProducts[0]?.name ?? "Ainda sem destaque no mes."}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-4">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Categoria com maior valor
            </p>
            <p className="mt-2 font-semibold text-base">
              {metrics.inventoryByCategory[0]?.categoryName ??
                "Sem estoque distribuido."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
