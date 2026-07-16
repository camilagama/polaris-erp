import type { Metadata } from "next";
import {
  getInventoryMovementsQuery,
  normalizeInventoryMovementFilters,
} from "@/features/products/queries";
import { requirePageAppContext } from "@/lib/app-session";
import { EstoquePanel } from "./_components/estoque-panel";

export const metadata: Metadata = {
  title: "Movimentacoes de estoque | Polaris",
  description: "Entradas, vendas, estornos e baixas de estoque.",
};

interface EstoquePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EstoquePage(props: EstoquePageProps) {
  const context = await requirePageAppContext();
  const searchParams = await props.searchParams;
  const filters = normalizeInventoryMovementFilters(searchParams);
  const movements = await getInventoryMovementsQuery({
    filters,
    organizationId: context.organizationId,
  });

  return (
    <EstoquePanel
      filters={movements.filters}
      initialCursor={movements.nextCursor ?? null}
      initialItems={movements.items}
      products={movements.products}
    />
  );
}
