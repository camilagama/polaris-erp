"use server";

import { eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import { products, saleItems, sales } from "@/db/schema";
import { findCardInstallmentRule } from "@/features/catalog/payment-rules";
import { getCatalogSettings } from "@/features/catalog/server";
import {
  buildSaleSnapshot,
  calculateSaleFinancials,
} from "@/features/sales/calculations";
import { createSaleSchema } from "@/features/sales/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { toCurrencyString } from "@/lib/domain/currency";
import { formatCurrency } from "@/lib/formatters";
import { requireActionSession } from "@/lib/server-action-auth";

interface LockedProductRow extends Record<string, unknown> {
  archivedAt: Date | null;
  costPrice: string;
  id: string;
  name: string;
  price: string;
  stock: number;
}

interface LockedSaleRow extends Record<string, unknown> {
  id: string;
  status: "cancelled" | "completed";
}

const revalidateSalesViews = () => {
  updateTag(CACHE_TAGS.analyticsShared);
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
      price,
      archived_at as "archivedAt"
    from products
    where id in (${clauses})
    order by id
    for update
  `);

  return result.rows;
};

export async function createSaleAction(data: {
  additionalAmount?: number;
  customerName?: string;
  discountAmount?: number;
  freightAmount?: number;
  items: Array<{
    expectedUnitPrice: number;
    productId: string;
    quantity: number;
  }>;
  notes?: string;
  occurredOn: string;
  paymentFeePayer: "customer" | "not_applicable" | "seller";
  paymentInstallments: number;
  paymentMethod: "card" | "pix";
}): Promise<string> {
  await requireActionSession();
  const parsed = createSaleSchema.parse(data);
  const catalogSettings = await getCatalogSettings();

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

        if (toCurrencyString(item.expectedUnitPrice) !== product.price) {
          throw new Error(
            `Preco do produto ${product.name} foi atualizado para ${formatCurrency(product.price)}. Revise a venda e tente novamente.`
          );
        }

        return {
          productId: item.productId,
          productNameSnapshot: product.name,
          quantity: item.quantity,
          unitCostSnapshot: Number(product.costPrice),
          unitPriceSnapshot: Number(product.price),
        };
      })
    );
    const installmentFeePercent =
      parsed.paymentMethod === "card"
        ? findCardInstallmentRule(
            catalogSettings.cardInstallmentRules,
            parsed.paymentInstallments
          )?.feePercent
        : 0;

    if (
      parsed.paymentMethod === "card" &&
      installmentFeePercent === undefined
    ) {
      throw new Error(
        "O parcelamento selecionado nao esta mais disponivel. Revise a venda."
      );
    }

    const financials = calculateSaleFinancials({
      additionalAmount: parsed.additionalAmount,
      discountAmount: parsed.discountAmount,
      freightAmount: parsed.freightAmount,
      installmentFeePercent: installmentFeePercent ?? 0,
      itemSubtotal: snapshot.totalAmount,
      paymentFeePayer: parsed.paymentFeePayer,
      paymentInstallments: parsed.paymentInstallments,
      paymentMethod: parsed.paymentMethod,
    });

    if (financials.totalAmount < 0) {
      throw new Error(
        "Desconto nao pode ser maior que o subtotal somado com frete e adicional."
      );
    }

    const [createdSale] = await tx
      .insert(sales)
      .values({
        additionalAmount: toCurrencyString(parsed.additionalAmount),
        chargedAmount: toCurrencyString(financials.chargedAmount),
        customerName: parsed.customerName || undefined,
        discountAmount: toCurrencyString(parsed.discountAmount),
        feeAmount: toCurrencyString(financials.feeAmount),
        freightAmount: toCurrencyString(parsed.freightAmount),
        notes: parsed.notes || undefined,
        occurredOn: parsed.occurredOn,
        paymentFeePayer: parsed.paymentFeePayer,
        paymentFeePercent: toCurrencyString(financials.paymentFeePercent),
        paymentInstallments: parsed.paymentInstallments,
        paymentMethod: parsed.paymentMethod,
        status: "completed",
        totalAmount: toCurrencyString(financials.totalAmount),
      })
      .returning({ id: sales.id });

    await tx.insert(saleItems).values(
      snapshot.items.map((item) => ({
        lineTotal: toCurrencyString(item.lineTotal),
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        saleId: createdSale.id,
        unitCostSnapshot: toCurrencyString(item.unitCostSnapshot),
        unitPriceSnapshot: toCurrencyString(item.unitPriceSnapshot),
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
