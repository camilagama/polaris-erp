"use server";

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products, saleItems, sales } from "@/db/schema";
import { buildSaleSnapshot } from "@/features/sales/calculations";
import { requireActionSession } from "@/lib/server-action-auth";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve usar o formato ISO YYYY-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Data invalida.");

const saleItemSchema = z.object({
  productId: z.string().min(1, "Produto invalido."),
  quantity: z.coerce
    .number()
    .int("Quantidade deve ser um numero inteiro.")
    .min(1, "Quantidade deve ser maior que zero."),
  unitPrice: z.coerce.number().min(0, "Preco de venda invalido."),
});

const createSaleSchema = z
  .object({
    customerName: z.string().trim().max(80).optional(),
    items: z
      .array(saleItemSchema)
      .min(1, "Adicione pelo menos um item na venda."),
    notes: z.string().trim().max(240).optional(),
    occurredOn: isoDateSchema,
  })
  .refine(
    (value) => {
      const uniqueProducts = new Set(value.items.map((item) => item.productId));
      return uniqueProducts.size === value.items.length;
    },
    {
      message: "Nao repita o mesmo produto na venda.",
      path: ["items"],
    }
  );

interface LockedProductRow extends Record<string, unknown> {
  archivedAt: Date | null;
  costPrice: string;
  id: string;
  name: string;
  stock: number;
}

interface LockedSaleRow extends Record<string, unknown> {
  id: string;
  status: "cancelled" | "completed";
}

const revalidateSalesViews = () => {
  revalidatePath("/vendas");
  revalidatePath("/produtos");
  refresh();
};

const lockProductsForUpdate = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: string[]
): Promise<LockedProductRow[]> => {
  if (productIds.length === 0) {
    return [];
  }

  const clauses = sql.join(
    productIds.map((productId) => sql`${productId}`),
    sql`, `
  );

  const result = await tx.execute<LockedProductRow>(sql`
    select
      id,
      name,
      stock,
      cost_price as "costPrice",
      archived_at as "archivedAt"
    from products
    where id in (${clauses})
    order by id
    for update
  `);

  return result.rows;
};

export interface SaleListItem {
  cancelledAt: Date | null;
  customerName: string | null;
  id: string;
  itemCount: number;
  occurredOn: string;
  status: "cancelled" | "completed";
  totalAmount: string;
}

export interface SaleDetailItem {
  createdAt: Date;
  id: string;
  lineTotal: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitCostSnapshot: string;
  unitPriceSnapshot: string;
}

export interface SaleDetail {
  cancelledAt: Date | null;
  createdAt: Date;
  customerName: string | null;
  id: string;
  items: SaleDetailItem[];
  notes: string | null;
  occurredOn: string;
  status: "cancelled" | "completed";
  totalAmount: string;
}

export async function getSalesAction(): Promise<SaleListItem[]> {
  const rows = await db
    .select({
      cancelledAt: sales.cancelledAt,
      customerName: sales.customerName,
      id: sales.id,
      itemCount: count(saleItems.id),
      occurredOn: sales.occurredOn,
      status: sales.status,
      totalAmount: sales.totalAmount,
    })
    .from(sales)
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .groupBy(sales.id)
    .orderBy(desc(sales.occurredOn), desc(sales.createdAt));

  return rows.map((row) => ({
    ...row,
    itemCount: Number(row.itemCount),
    status: row.status as SaleListItem["status"],
  }));
}

export async function getSaleByIdAction(
  id: string
): Promise<SaleDetail | undefined> {
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
  });

  if (!sale) {
    return undefined;
  }

  const items = await db
    .select({
      createdAt: saleItems.createdAt,
      id: saleItems.id,
      lineTotal: saleItems.lineTotal,
      productId: saleItems.productId,
      productNameSnapshot: saleItems.productNameSnapshot,
      quantity: saleItems.quantity,
      unitCostSnapshot: saleItems.unitCostSnapshot,
      unitPriceSnapshot: saleItems.unitPriceSnapshot,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, id))
    .orderBy(asc(saleItems.createdAt));

  return {
    ...sale,
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    })),
    status: sale.status as SaleDetail["status"],
  };
}

export async function createSaleAction(data: {
  customerName?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
  occurredOn: string;
}): Promise<string> {
  await requireActionSession();
  const parsed = createSaleSchema.parse(data);

  const createdSaleId = await db.transaction(async (tx) => {
    const productIds = parsed.items
      .map((item) => item.productId)
      .sort((left, right) => left.localeCompare(right));

    const lockedProducts = await lockProductsForUpdate(tx, productIds);

    if (lockedProducts.length !== productIds.length) {
      throw new Error("Um ou mais produtos nao foram encontrados.");
    }

    const productById = new Map(
      lockedProducts.map((product) => [product.id, product])
    );

    const snapshot = buildSaleSnapshot(
      parsed.items.map((item) => {
        const product = productById.get(item.productId);

        if (!product) {
          throw new Error("Produto nao encontrado.");
        }

        if (product.archivedAt) {
          throw new Error(
            `Produto arquivado nao pode ser vendido: ${product.name}.`
          );
        }

        if (item.quantity > product.stock) {
          throw new Error(`Estoque insuficiente para ${product.name}.`);
        }

        return {
          productId: item.productId,
          productNameSnapshot: product.name,
          quantity: item.quantity,
          unitCostSnapshot: Number(product.costPrice),
          unitPriceSnapshot: item.unitPrice,
        };
      })
    );

    const [createdSale] = await tx
      .insert(sales)
      .values({
        customerName: parsed.customerName || undefined,
        notes: parsed.notes || undefined,
        occurredOn: parsed.occurredOn,
        status: "completed",
        totalAmount: snapshot.totalAmount.toFixed(2),
      })
      .returning({ id: sales.id });

    await tx.insert(saleItems).values(
      snapshot.items.map((item) => ({
        lineTotal: item.lineTotal.toFixed(2),
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        saleId: createdSale.id,
        unitCostSnapshot: item.unitCostSnapshot.toFixed(2),
        unitPriceSnapshot: item.unitPriceSnapshot.toFixed(2),
      }))
    );

    for (const item of snapshot.items) {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("Produto nao encontrado.");
      }

      await tx
        .update(products)
        .set({
          stock: product.stock - item.quantity,
        })
        .where(eq(products.id, item.productId));
    }

    return createdSale.id;
  });

  revalidateSalesViews();
  return createdSaleId;
}

export async function cancelSaleAction(id: string) {
  await requireActionSession();

  await db.transaction(async (tx) => {
    const saleResult = await tx.execute<LockedSaleRow>(sql`
      select
        id,
        status
      from sales
      where id = ${id}
      for update
    `);

    const sale = saleResult.rows[0];

    if (!sale) {
      throw new Error("Venda nao encontrada.");
    }

    if (sale.status === "cancelled") {
      throw new Error("Venda ja foi cancelada.");
    }

    const saleRows = await tx
      .select({
        productId: saleItems.productId,
        quantity: saleItems.quantity,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    if (saleRows.length === 0) {
      throw new Error("Venda sem itens nao pode ser cancelada.");
    }

    const productIds = [
      ...new Set(saleRows.map((item) => item.productId)),
    ].sort((left, right) => left.localeCompare(right));

    const lockedProducts = await lockProductsForUpdate(tx, productIds);

    if (lockedProducts.length !== productIds.length) {
      throw new Error(
        "Nao foi possivel estornar o estoque porque um produto foi removido."
      );
    }

    const productById = new Map(
      lockedProducts.map((product) => [product.id, product])
    );

    for (const item of saleRows) {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("Produto nao encontrado para estorno.");
      }

      await tx
        .update(products)
        .set({
          stock: product.stock + Number(item.quantity),
        })
        .where(eq(products.id, item.productId));
    }

    await tx
      .update(sales)
      .set({
        cancelledAt: new Date(),
        status: "cancelled",
      })
      .where(eq(sales.id, id));
  });

  revalidateSalesViews();
}
