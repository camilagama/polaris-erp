import "server-only";

import {
  auditEvents,
  products,
  saleItems,
  sales,
  stockMovements,
} from "@polaris/db/schema";
import {
  type TenantTransaction,
  withTenantContext,
} from "@polaris/db/tenant-context";
import {
  completeCommandExecution,
  reserveCommandExecution,
} from "@polaris/events";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import type { CardInstallmentRule } from "@/features/catalog/payment-rules";
import { findCardInstallmentRule } from "@/features/catalog/payment-rules";
import { getOperationalDateBounds } from "@/features/operations/date-bounds";
import { buildSalesAnalytics } from "@/features/sales/analytics";
import {
  buildSaleSnapshot,
  calculateSaleFinancials,
} from "@/features/sales/calculations";
import type { SalesAnalytics } from "@/features/sales/contracts";
import { toCurrencyString } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";
import { formatCurrency } from "@/lib/formatters";

interface LockedProductRow extends Record<string, unknown> {
  archivedAt: Date | null;
  costPrice: string;
  id: string;
  name: string;
  price: string;
  softDeletedAt: Date | null;
  stock: number;
}

interface LockedSaleRow extends Record<string, unknown> {
  id: string;
  status: "cancelled" | "completed";
}

interface CancelSaleResult {
  saleId: string;
}

const toCancelSaleResult = (
  value: Record<string, unknown>
): CancelSaleResult => {
  const saleId = value.saleId;

  if (typeof saleId !== "string" || saleId.length === 0) {
    throw new Error("Resultado de cancelamento de venda invalido.");
  }

  return { saleId };
};

const getCancellationReplayResult = (
  reservation: Awaited<ReturnType<typeof reserveCommandExecution>>
): CancelSaleResult | null => {
  if (reservation.kind === "processing") {
    throw new Error("Cancelamento de venda ainda esta em processamento.");
  }

  if (reservation.kind !== "replay") {
    return null;
  }

  if (reservation.status === "failed") {
    throw new Error("O cancelamento anterior falhou. Tente novamente.");
  }

  return toCancelSaleResult(reservation.result);
};

interface CreateSaleInput {
  additionalAmount: number;
  customerName?: string;
  discountAmount: number;
  freightAmount: number;
  idempotencyKey?: string;
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
}

const SALES_IDEMPOTENCY_CONSTRAINT =
  "sales_organization_idempotency_key_unique_idx";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isIdempotencyConflict = (error: unknown): boolean => {
  if (!isRecord(error)) {
    return false;
  }

  if (
    error.code === "23505" &&
    error.constraint === SALES_IDEMPOTENCY_CONSTRAINT
  ) {
    return true;
  }

  return isIdempotencyConflict(error.cause);
};

export const getSalesDateBounds = getOperationalDateBounds;

export const getSalesAnalytics = async ({
  from,
  organizationId,
  to,
}: {
  from: string;
  organizationId: string;
  to: string;
}): Promise<SalesAnalytics> => {
  const [salesRows, saleItemRows] = await withTenantContext(
    organizationId,
    async (tx) => {
      const salesResult = await tx
        .select({
          feeAmount: sales.feeAmount,
          freightAmount: sales.freightAmount,
          occurredOn: sales.occurredOn,
          paymentMethod: sales.paymentMethod,
          status: sales.status,
          totalAmount: sales.totalAmount,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, organizationId),
            gte(sales.occurredOn, from),
            lte(sales.occurredOn, to)
          )
        )
        .orderBy(asc(sales.occurredOn));
      const saleItemResult = await tx
        .select({
          occurredOn: sales.occurredOn,
          quantity: saleItems.quantity,
          status: sales.status,
          unitCostSnapshot: saleItems.unitCostSnapshot,
        })
        .from(saleItems)
        .innerJoin(
          sales,
          and(
            eq(saleItems.saleId, sales.id),
            eq(sales.organizationId, organizationId)
          )
        )
        .where(
          and(
            eq(saleItems.organizationId, organizationId),
            eq(sales.organizationId, organizationId),
            gte(sales.occurredOn, from),
            lte(sales.occurredOn, to)
          )
        )
        .orderBy(asc(sales.occurredOn), asc(saleItems.createdAt));

      return [salesResult, saleItemResult] as const;
    }
  );

  return buildSalesAnalytics({
    range: { from, to },
    saleItems: saleItemRows.map((row) => ({
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
      unitCostSnapshot: Number(row.unitCostSnapshot),
    })),
    sales: salesRows.map((row) => ({
      feeAmount: Number(row.feeAmount),
      freightAmount: Number(row.freightAmount),
      occurredOn: row.occurredOn,
      paymentMethod: row.paymentMethod as "card" | "pix",
      status: row.status as "cancelled" | "completed",
      totalAmount: Number(row.totalAmount),
    })),
  });
};

const findExistingSaleByIdempotencyKey = async (
  organizationId: string,
  idempotencyKey: string | undefined
): Promise<string | null> => {
  if (!idempotencyKey) {
    return null;
  }

  const existingSale = await withTenantContext(organizationId, (tx) =>
    tx.query.sales.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(sales.organizationId, organizationId),
        eq(sales.idempotencyKey, idempotencyKey)
      ),
    })
  );

  return existingSale?.id ?? null;
};

const lockProductsForUpdate = async (
  tx: TenantTransaction,
  organizationId: string,
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
      archived_at as "archivedAt",
      soft_deleted_at as "softDeletedAt"
    from products
    where organization_id = ${organizationId} and id in (${clauses})
    order by id
    for update
  `);

  return result.rows;
};

const createSale = async ({
  actorUserId,
  cardInstallmentRules,
  input,
  organizationId,
}: {
  actorUserId: string;
  cardInstallmentRules: CardInstallmentRule[];
  input: CreateSaleInput;
  organizationId: string;
}): Promise<string> =>
  withTenantContext(organizationId, async (tx) => {
    const productIds = input.items
      .map((item) => item.productId)
      .sort((left, right) => left.localeCompare(right));

    const lockedProducts = await lockProductsForUpdate(
      tx,
      organizationId,
      productIds
    );

    if (lockedProducts.length !== productIds.length) {
      throw new Error("Um ou mais produtos nao foram encontrados.");
    }

    const productById = new Map(
      lockedProducts.map((product) => [product.id, product])
    );

    const snapshot = buildSaleSnapshot(
      input.items.map((item) => {
        const product = productById.get(item.productId);

        if (!product) {
          throw new Error("Produto nao encontrado.");
        }

        if (product.archivedAt) {
          throw new Error(
            `Produto arquivado nao pode ser vendido: ${product.name}.`
          );
        }

        if (product.softDeletedAt) {
          throw new Error(
            `Produto removido definitivamente nao pode ser vendido: ${product.name}.`
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
      input.paymentMethod === "card"
        ? findCardInstallmentRule(
            cardInstallmentRules,
            input.paymentInstallments
          )?.feePercent
        : 0;

    if (input.paymentMethod === "card" && installmentFeePercent === undefined) {
      throw new Error(
        "O parcelamento selecionado nao esta mais disponivel. Revise a venda."
      );
    }

    const financials = calculateSaleFinancials({
      additionalAmount: input.additionalAmount,
      discountAmount: input.discountAmount,
      freightAmount: input.freightAmount,
      installmentFeePercent: installmentFeePercent ?? 0,
      itemSubtotal: snapshot.totalAmount,
      paymentFeePayer: input.paymentFeePayer,
      paymentInstallments: input.paymentInstallments,
      paymentMethod: input.paymentMethod,
    });

    if (financials.totalAmount < 0) {
      throw new Error(
        "Desconto nao pode ser maior que o subtotal somado com frete e adicional."
      );
    }

    const [createdSale] = await tx
      .insert(sales)
      .values({
        additionalAmount: toCurrencyString(input.additionalAmount),
        chargedAmount: toCurrencyString(financials.chargedAmount),
        customerName: input.customerName || undefined,
        discountAmount: toCurrencyString(input.discountAmount),
        feeAmount: toCurrencyString(financials.feeAmount),
        freightAmount: toCurrencyString(input.freightAmount),
        idempotencyKey: input.idempotencyKey,
        notes: input.notes || undefined,
        occurredOn: input.occurredOn,
        organizationId,
        paymentFeePayer: input.paymentFeePayer,
        paymentFeePercent: toCurrencyString(financials.paymentFeePercent),
        paymentInstallments: input.paymentInstallments,
        paymentMethod: input.paymentMethod,
        status: "completed",
        totalAmount: toCurrencyString(financials.totalAmount),
      })
      .returning({ id: sales.id });

    const createdSaleItems = await tx
      .insert(saleItems)
      .values(
        snapshot.items.map((item) => ({
          lineTotal: toCurrencyString(item.lineTotal),
          organizationId,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          saleId: createdSale.id,
          unitCostSnapshot: toCurrencyString(item.unitCostSnapshot),
          unitPriceSnapshot: toCurrencyString(item.unitPriceSnapshot),
        }))
      )
      .returning({
        id: saleItems.id,
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        unitCostSnapshot: saleItems.unitCostSnapshot,
      });

    await tx.insert(stockMovements).values(
      createdSaleItems.map((item) => ({
        delta: -Number(item.quantity),
        occurredOn: input.occurredOn,
        organizationId,
        productId: item.productId,
        sourceId: item.id,
        type: "sale" as const,
        unitCostSnapshot: item.unitCostSnapshot,
      }))
    );

    for (const item of snapshot.items) {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("Produto nao encontrado.");
      }

      const updatedProductRows = await tx
        .update(products)
        .set({
          stock: product.stock - item.quantity,
        })
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.organizationId, organizationId)
          )
        )
        .returning({ id: products.id });

      if (updatedProductRows.length === 0) {
        throw new Error("Produto nao encontrado.");
      }
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { itemCount: snapshot.items.length },
      organizationId,
      subjectId: createdSale.id,
      subjectType: "sale",
      type: "sale.created",
    });

    return createdSale.id;
  });

export const createSaleOnce = async ({
  actorUserId,
  input,
  loadCardInstallmentRules,
  organizationId,
}: {
  actorUserId: string;
  input: CreateSaleInput;
  loadCardInstallmentRules: () => Promise<CardInstallmentRule[]>;
  organizationId: string;
}): Promise<{ created: boolean; saleId: string }> => {
  const existingSaleId = await findExistingSaleByIdempotencyKey(
    organizationId,
    input.idempotencyKey
  );

  if (existingSaleId) {
    return { created: false, saleId: existingSaleId };
  }

  try {
    const cardInstallmentRules = await loadCardInstallmentRules();
    const saleId = await createSale({
      actorUserId,
      cardInstallmentRules,
      input,
      organizationId,
    });

    return { created: true, saleId };
  } catch (error) {
    if (isIdempotencyConflict(error)) {
      const concurrentSaleId = await findExistingSaleByIdempotencyKey(
        organizationId,
        input.idempotencyKey
      );

      if (concurrentSaleId) {
        return { created: false, saleId: concurrentSaleId };
      }
    }

    throw error;
  }
};

export const cancelSale = ({
  actorUserId,
  idempotencyKey,
  organizationId,
  saleId,
}: {
  actorUserId: string;
  idempotencyKey: string;
  organizationId: string;
  saleId: string;
}): Promise<CancelSaleResult> =>
  withTenantContext(organizationId, async (tx) => {
    const reservation = await reserveCommandExecution(tx, {
      commandType: "sale.cancel",
      correlationId: idempotencyKey,
      idempotencyKey,
      organizationId,
    });

    const replayResult = getCancellationReplayResult(reservation);

    if (replayResult) {
      return replayResult;
    }

    const saleResult = await tx.execute<LockedSaleRow>(sql`
      select
        id,
        status
      from sales
      where id = ${saleId} and organization_id = ${organizationId}
      for update
    `);

    const sale = saleResult.rows[0];

    if (!sale) {
      throw new Error("Venda nao encontrada.");
    }

    if (sale.status === "cancelled") {
      const result = { saleId };
      await completeCommandExecution(tx, {
        commandId: reservation.commandId,
        result,
        status: "succeeded",
      });
      return result;
    }

    const saleRows = await tx
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        unitCostSnapshot: saleItems.unitCostSnapshot,
      })
      .from(saleItems)
      .where(
        and(
          eq(saleItems.saleId, saleId),
          eq(saleItems.organizationId, organizationId)
        )
      );

    if (saleRows.length === 0) {
      throw new Error("Venda sem itens nao pode ser cancelada.");
    }

    const productIds = [
      ...new Set(saleRows.map((item) => item.productId)),
    ].sort((left, right) => left.localeCompare(right));

    const lockedProducts = await lockProductsForUpdate(
      tx,
      organizationId,
      productIds
    );

    if (lockedProducts.length !== productIds.length) {
      throw new Error(
        "Nao foi possivel estornar o estoque: um dos produtos foi removido do catalogo. Contate o suporte ou ajuste o estoque manualmente."
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

      const updatedProductRows = await tx
        .update(products)
        .set({
          stock: product.stock + Number(item.quantity),
        })
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.organizationId, organizationId)
          )
        )
        .returning({ id: products.id });

      if (updatedProductRows.length === 0) {
        throw new Error("Produto nao encontrado para estorno.");
      }
    }

    const cancelledRows = await tx
      .update(sales)
      .set({
        cancelledAt: new Date(),
        cancelledOn: formatDateInputValue(),
        status: "cancelled",
      })
      .where(
        and(eq(sales.id, saleId), eq(sales.organizationId, organizationId))
      )
      .returning({ id: sales.id });

    if (cancelledRows.length === 0) {
      throw new Error("Venda nao encontrada.");
    }

    await tx.insert(stockMovements).values(
      saleRows.map((item) => ({
        delta: Number(item.quantity),
        occurredOn: formatDateInputValue(),
        organizationId,
        productId: item.productId,
        sourceId: item.id,
        type: "sale_reversal" as const,
        unitCostSnapshot: item.unitCostSnapshot,
      }))
    );

    await tx.insert(auditEvents).values({
      actorUserId,
      organizationId,
      subjectId: saleId,
      subjectType: "sale",
      type: "sale.cancelled",
    });
    const result = { saleId };
    await completeCommandExecution(tx, {
      commandId: reservation.commandId,
      result,
      status: "succeeded",
    });

    return result;
  });
