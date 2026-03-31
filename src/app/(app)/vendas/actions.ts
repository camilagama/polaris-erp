"use server";

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products, saleItems, sales, systemSettings } from "@/db/schema";
import { GLOBAL_SETTINGS_ID } from "@/features/catalog/constants";
import {
  findPaymentRuleByCode,
  normalizePaymentFeeRules,
} from "@/features/catalog/payment-rules";
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
});

const createSaleSchema = z
  .object({
    additionalAmount: z.coerce
      .number()
      .min(0, "Adicional nao pode ser negativo.")
      .default(0),
    customerName: z.string().trim().max(80).optional(),
    discountAmount: z.coerce
      .number()
      .min(0, "Desconto nao pode ser negativo.")
      .default(0),
    freightAmount: z.coerce
      .number()
      .min(0, "Frete nao pode ser negativo.")
      .default(0),
    items: z
      .array(saleItemSchema)
      .min(1, "Adicione pelo menos um item na venda."),
    notes: z.string().trim().max(240).optional(),
    occurredOn: isoDateSchema,
    paymentOptionCode: z
      .string()
      .trim()
      .min(1, "Metodo de pagamento invalido.")
      .default("pix"),
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
  price: string;
  stock: number;
}

interface LockedSaleRow extends Record<string, unknown> {
  id: string;
  status: "cancelled" | "completed";
}

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

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
      price,
      archived_at as "archivedAt"
    from products
    where id in (${clauses})
    order by id
    for update
  `);

  return result.rows;
};

export interface SaleListItem {
  additionalAmount: string;
  cancelledAt: Date | null;
  customerName: string | null;
  discountAmount: string;
  feeAmount: string;
  freightAmount: string;
  id: string;
  itemCount: number;
  occurredOn: string;
  paymentFeePercent: string;
  paymentInstallments: number;
  paymentMethod: "card" | "pix";
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
  additionalAmount: string;
  cancelledAt: Date | null;
  createdAt: Date;
  customerName: string | null;
  discountAmount: string;
  feeAmount: string;
  freightAmount: string;
  id: string;
  items: SaleDetailItem[];
  notes: string | null;
  occurredOn: string;
  paymentFeePercent: string;
  paymentInstallments: number;
  paymentMethod: "card" | "pix";
  status: "cancelled" | "completed";
  totalAmount: string;
}

export async function getSalesAction(): Promise<SaleListItem[]> {
  const rows = await db
    .select({
      additionalAmount: sales.additionalAmount,
      cancelledAt: sales.cancelledAt,
      customerName: sales.customerName,
      discountAmount: sales.discountAmount,
      feeAmount: sales.feeAmount,
      paymentFeePercent: sales.paymentFeePercent,
      paymentInstallments: sales.paymentInstallments,
      freightAmount: sales.freightAmount,
      id: sales.id,
      itemCount: count(saleItems.id),
      occurredOn: sales.occurredOn,
      paymentMethod: sales.paymentMethod,
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
    paymentInstallments: Number(row.paymentInstallments),
    paymentMethod: row.paymentMethod as SaleListItem["paymentMethod"],
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
    paymentInstallments: Number(sale.paymentInstallments),
    paymentMethod: sale.paymentMethod as SaleDetail["paymentMethod"],
    status: sale.status as SaleDetail["status"],
  };
}

export async function createSaleAction(data: {
  additionalAmount?: number;
  customerName?: string;
  discountAmount?: number;
  freightAmount?: number;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
  occurredOn: string;
  paymentOptionCode: string;
}): Promise<string> {
  await requireActionSession();
  const parsed = createSaleSchema.parse(data);
  const rawCardFeeSetting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.id, GLOBAL_SETTINGS_ID),
  });
  const paymentFeeRules = normalizePaymentFeeRules(
    rawCardFeeSetting?.paymentFeeRules,
    Number(rawCardFeeSetting?.cardFeePercent ?? 0)
  );
  const selectedPaymentRule = findPaymentRuleByCode(
    paymentFeeRules,
    parsed.paymentOptionCode
  );

  if (!selectedPaymentRule) {
    throw new Error(
      "Metodo de pagamento invalido para as configuracoes atuais."
    );
  }

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
          unitPriceSnapshot: Number(product.price),
        };
      })
    );

    const partialAmount = roundCurrency(
      snapshot.totalAmount +
        parsed.freightAmount +
        parsed.additionalAmount -
        parsed.discountAmount
    );

    if (partialAmount < 0) {
      throw new Error(
        "Desconto nao pode ser maior que o subtotal somado com frete e adicional."
      );
    }

    const calculatedFeeAmount =
      partialAmount > 0
        ? roundCurrency(partialAmount * (selectedPaymentRule.feePercent / 100))
        : 0;

    const finalTotalAmount = roundCurrency(partialAmount + calculatedFeeAmount);

    const [createdSale] = await tx
      .insert(sales)
      .values({
        additionalAmount: parsed.additionalAmount.toFixed(2),
        customerName: parsed.customerName || undefined,
        discountAmount: parsed.discountAmount.toFixed(2),
        feeAmount: calculatedFeeAmount.toFixed(2),
        freightAmount: parsed.freightAmount.toFixed(2),
        notes: parsed.notes || undefined,
        occurredOn: parsed.occurredOn,
        paymentFeePercent: selectedPaymentRule.feePercent.toFixed(2),
        paymentInstallments: selectedPaymentRule.installments,
        paymentMethod: selectedPaymentRule.paymentMethod,
        status: "completed",
        totalAmount: finalTotalAmount.toFixed(2),
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
