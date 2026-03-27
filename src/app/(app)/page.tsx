import { desc } from "drizzle-orm";
import { db } from "@/db";
import { inventoryMovements, products, purchases } from "@/db/schema";
import { toNumber } from "@/lib/domain/calculations";

const metricCardClassName =
  "rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm";

export default async function DashboardPage() {
  const [productRows, recentPurchases, recentMovements] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)).limit(12),
    db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(5),
    db
      .select()
      .from(inventoryMovements)
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(5),
  ]);

  const activeProducts = productRows.filter(
    (product) => product.status === "active"
  );
  const lowStockProducts = productRows.filter(
    (product) => product.currentStock <= 2 && product.status === "active"
  );
  const stockValue = productRows.reduce(
    (total, product) =>
      total + product.currentStock * toNumber(product.averageCost),
    0
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
          Visao geral
        </p>
        <h1 className="font-heading font-semibold text-3xl tracking-tight">
          Dashboard operacional
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Esta entrega cobre a fundacao transacional da V1. Produtos, estoque e
          compras ja operam em cima do schema novo; vendas, recebimentos e
          indicadores financeiros completos entram na sequencia.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Produtos ativos</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {activeProducts.length}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Estoque critico</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {lowStockProducts.length}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Capital em estoque</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {stockValue.toLocaleString("pt-BR", {
              currency: "BRL",
              style: "currency",
            })}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Compras recentes</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {recentPurchases.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Ultimos movimentos</h2>
              <p className="text-muted-foreground text-sm">
                Historico de saldo gerado pelo ledger de estoque.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {recentMovements.length > 0 ? (
              recentMovements.map((movement) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-4 py-3"
                  key={movement.id}
                >
                  <div>
                    <p className="font-medium text-sm">{movement.type}</p>
                    <p className="text-muted-foreground text-xs">
                      Produto #{movement.productId}
                    </p>
                  </div>
                  <span
                    className={
                      movement.quantityDelta >= 0
                        ? "font-semibold text-emerald-500 text-sm"
                        : "font-semibold text-destructive text-sm"
                    }
                  >
                    {movement.quantityDelta >= 0 ? "+" : ""}
                    {movement.quantityDelta}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-border/60 border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
                Ainda nao ha movimentos de estoque registrados.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-lg">Proximos marcos</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              "Consolidar produtos e ajustes de estoque no fluxo diario.",
              "Confirmar compras recebidas para ativar custo medio movel.",
              "Abrir em seguida vendas, recebimentos e indicadores financeiros.",
            ].map((item) => (
              <div
                className="rounded-xl border border-border/50 bg-background/60 px-4 py-3"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
