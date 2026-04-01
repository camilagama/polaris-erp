import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { products, sales } from "@/db/schema";
import { getCatalogSettings } from "@/features/catalog/server";
import { formatDateInputValue } from "@/lib/domain/date";
import { formatCurrency } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | DG Imports",
  description: "Painel inicial da operacao protegida do DG Imports.",
};

export default async function DashboardPage() {
  const today = formatDateInputValue();

  const [
    [salesToday],
    [outOfStock],
    [archivedProducts],
    settings,
    recentSales,
  ] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
        totalSales: count(sales.id),
      })
      .from(sales)
      .where(and(eq(sales.occurredOn, today), eq(sales.status, "completed"))),
    db
      .select({
        totalProducts: count(products.id),
      })
      .from(products)
      .where(and(eq(products.stock, 0), sql`${products.archivedAt} is null`)),
    db
      .select({
        totalProducts: count(products.id),
      })
      .from(products)
      .where(sql`${products.archivedAt} is not null`),
    getCatalogSettings(),
    db
      .select({
        customerName: sales.customerName,
        id: sales.id,
        occurredOn: sales.occurredOn,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .orderBy(desc(sales.createdAt))
      .limit(3),
  ]);

  const summaryCards = [
    {
      label: "Vendas hoje",
      value: `${salesToday.totalSales}`,
      note: formatCurrency(salesToday.total),
    },
    {
      label: "Sem estoque",
      value: `${outOfStock.totalProducts}`,
      note: "Produtos ativos zerados",
    },
    {
      label: "Arquivados",
      value: `${archivedProducts.totalProducts}`,
      note: "Itens fora da operacao diaria",
    },
    {
      label: "Precificacao ativa",
      value: `${settings.minimumMarkupPercent.toFixed(0)}% / ${settings.idealMarkupPercent.toFixed(0)}%`,
      note: `${settings.paymentFeeRules.length} regra(s) de pagamento`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
          Painel operacional
        </p>
        <h1 className="font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
          Visao rapida da operacao de hoje
        </h1>
        <p className="max-w-3xl text-muted-foreground text-sm leading-6">
          O dashboard resume o que precisa de atencao imediata sem perder o
          estilo minimalista do produto: vendas do dia, estoque zerado,
          arquivados e parametros ativos de precificacao.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="gap-2">
              <CardTitle className="font-medium text-muted-foreground text-sm">
                {card.label}
              </CardTitle>
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Atalhos operacionais</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild>
              <Link href="/produtos">Abrir produtos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/vendas">Registrar ou revisar vendas</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/configuracoes">Ajustar margens e taxas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Ultimas vendas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentSales.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma venda registrada ainda.
              </p>
            ) : (
              recentSales.map((sale) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/10 px-3 py-3 transition-colors hover:bg-muted/20"
                  href={`/vendas/${sale.id}`}
                  key={sale.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {sale.customerName || "Sem cliente"}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {sale.id} - {sale.occurredOn}
                    </p>
                  </div>
                  <strong className="font-mono text-sm">
                    {formatCurrency(sale.totalAmount)}
                  </strong>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
