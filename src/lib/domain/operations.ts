import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryMovements,
  paymentEvents,
  products,
  purchases,
  saleItems,
  sales,
  systemSettings,
} from "@/db/schema";
import {
  calculateMovingAverageCost,
  calculatePurchaseTotal,
  calculatePurchaseUnitCost,
  calculateSaleItemsSubtotal,
  calculateSaleOrderTotal,
  roundMoney,
  toNumber,
} from "@/lib/domain/calculations";
import {
  calculatePaymentEventNetAmount,
  type PaymentEventStatus,
  type PaymentMethodType,
  summarizePaymentLedger,
} from "@/lib/domain/payment-ledger";

const toMoneyString = (value: number) => roundMoney(value).toFixed(2);

interface ProductInput {
  barcode?: string;
  category?: string;
  description?: string;
  initialStock: number;
  minimumStock?: number;
  name: string;
  notes?: string;
  salePrice: number;
  sku?: string;
  unitCost: number;
}

interface InventoryAdjustmentInput {
  note?: string;
  productId: number;
  quantity: number;
  type:
    | "adjustment_plus"
    | "adjustment_minus"
    | "customer_return"
    | "damage"
    | "loss";
}

interface PurchaseInput {
  cardFeeAmount?: number;
  notes?: string;
  otherCostsAmount?: number;
  productId: number;
  quantity: number;
  shippingAmount?: number;
  status: "draft" | "registered";
  supplierAmount: number;
}

interface SettingsInput {
  estimatedFeePercent: number;
  lowStockThreshold: number;
  minimumMarginPercent: number;
  staleProductDays: number;
  targetMarginPercent: number;
}

interface SaleItemInput {
  productId: number;
  quantity: number;
  unitSalePrice: number;
}

interface SalePaymentInput {
  dueDate?: Date | null;
  effectiveDate?: Date | null;
  feeAmount?: number;
  grossAmount: number;
  method: PaymentMethodType;
  notes?: string;
  status: PaymentEventStatus;
}

interface SaleInput {
  channel: string;
  discountAmount?: number;
  items: SaleItemInput[];
  notes?: string;
  payments?: SalePaymentInput[];
  shippingChargedAmount?: number;
}

interface PaymentEventInput extends SalePaymentInput {
  saleId: number;
  type: "payment" | "refund" | "chargeback";
}

const lockProductRows = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: number[]
) => {
  const uniqueSortedIds = Array.from(new Set(productIds)).sort(
    (left, right) => left - right
  );

  for (const productId of uniqueSortedIds) {
    await tx.execute(
      sql`select id from products where id = ${productId} for update`
    );
  }

  return uniqueSortedIds;
};

const getLockedProducts = (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: number[]
) => {
  if (productIds.length === 0) {
    return Promise.resolve([]);
  }

  return tx.select().from(products).where(inArray(products.id, productIds));
};

const validateSaleOrderTotal = (orderTotal: number) => {
  if (orderTotal < 0) {
    throw new Error("O desconto nao pode deixar o pedido negativo.");
  }
};

const normalizePaymentEventInput = (input: PaymentEventInput) => {
  if (input.grossAmount <= 0) {
    throw new Error("Informe um valor bruto maior que zero.");
  }

  const feeAmount = input.feeAmount ?? 0;

  if (feeAmount < 0) {
    throw new Error("A taxa nao pode ser negativa.");
  }

  if (feeAmount > input.grossAmount) {
    throw new Error("A taxa nao pode ser maior do que o valor bruto.");
  }

  if (input.status === "confirmed" && !input.effectiveDate) {
    throw new Error("Informe a data efetiva para eventos confirmados.");
  }

  if (input.type !== "payment" && input.status !== "confirmed") {
    throw new Error(
      "Refunds e chargebacks devem ser registrados como confirmados."
    );
  }

  return {
    dueDate: input.dueDate ?? null,
    effectiveDate: input.effectiveDate ?? null,
    feeAmount,
    grossAmount: input.grossAmount,
    netAmount: calculatePaymentEventNetAmount({
      feeAmount,
      grossAmount: input.grossAmount,
      type: input.type,
    }),
    notes: input.notes?.trim() || null,
    status: input.status,
    type: input.type,
  };
};

const recalculateSaleFinancials = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  saleId: number
) => {
  const [sale] = await tx
    .select()
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) {
    throw new Error("Venda nao encontrada.");
  }

  const salePaymentRows = await tx
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.saleId, saleId));
  const summary = summarizePaymentLedger(
    toNumber(sale.orderTotal),
    salePaymentRows
  );

  await tx
    .update(sales)
    .set({
      paymentStatus: summary.paymentStatus,
      receivedGrossTotal: toMoneyString(summary.confirmedGrossTotal),
      receivedNetTotal: toMoneyString(summary.confirmedNetTotal),
      updatedAt: new Date(),
    })
    .where(eq(sales.id, saleId));

  return summary;
};

export const createProduct = async (
  input: ProductInput,
  createdByUserId: string
) =>
  db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        averageCost: toMoneyString(input.unitCost),
        barcode: input.barcode?.trim() || null,
        category: input.category?.trim() || null,
        createdByUserId,
        currentStock: input.initialStock,
        description: input.description?.trim() || null,
        minimumStock: input.minimumStock ?? 0,
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
        salePrice: toMoneyString(input.salePrice),
        sku: input.sku?.trim() || null,
      })
      .returning();

    if (input.initialStock > 0) {
      await tx.insert(inventoryMovements).values({
        createdByUserId,
        note: "Estoque inicial informado no cadastro do produto.",
        productId: product.id,
        quantityDelta: input.initialStock,
        type: "initial_stock",
        unitCostSnapshot: toMoneyString(input.unitCost),
      });
    }

    return product;
  });

export const updateProductStatus = async (
  productId: number,
  status: "active" | "inactive"
) =>
  db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(eq(products.id, productId));

export const updateProductCommercialData = async (input: {
  productId: number;
  salePrice: number;
}) => {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  await db
    .update(products)
    .set({
      salePrice: toMoneyString(input.salePrice),
      updatedAt: new Date(),
    })
    .where(eq(products.id, input.productId));
};

export const createInventoryAdjustment = async (
  input: InventoryAdjustmentInput,
  createdByUserId: string
) =>
  db.transaction(async (tx) => {
    await lockProductRows(tx, [input.productId]);

    const [product] = await getLockedProducts(tx, [input.productId]);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const normalizedQuantity =
      input.type === "adjustment_plus" || input.type === "customer_return"
        ? input.quantity
        : input.quantity * -1;
    const nextStock = product.currentStock + normalizedQuantity;

    if (nextStock < 0) {
      throw new Error("O ajuste deixaria o estoque negativo.");
    }

    await tx.insert(inventoryMovements).values({
      createdByUserId,
      note: input.note?.trim() || null,
      productId: product.id,
      quantityDelta: normalizedQuantity,
      type: input.type,
      unitCostSnapshot: product.averageCost,
    });

    await tx
      .update(products)
      .set({
        currentStock: nextStock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));
  });

export const createPurchase = (
  input: PurchaseInput,
  createdByUserId: string
) => {
  const totalCost = calculatePurchaseTotal({
    cardFeeAmount: input.cardFeeAmount ?? 0,
    otherCostsAmount: input.otherCostsAmount ?? 0,
    shippingAmount: input.shippingAmount ?? 0,
    supplierAmount: input.supplierAmount,
  });
  const unitCost = calculatePurchaseUnitCost(totalCost, input.quantity);

  return db.insert(purchases).values({
    cardFeeAmount: toMoneyString(input.cardFeeAmount ?? 0),
    createdByUserId,
    notes: input.notes?.trim() || null,
    otherCostsAmount: toMoneyString(input.otherCostsAmount ?? 0),
    productId: input.productId,
    quantity: input.quantity,
    shippingAmount: toMoneyString(input.shippingAmount ?? 0),
    status: input.status,
    supplierAmount: toMoneyString(input.supplierAmount),
    totalCost: toMoneyString(totalCost),
    unitCost: toMoneyString(unitCost),
  });
};

export const receivePurchase = async (
  purchaseId: number,
  createdByUserId: string
) =>
  db.transaction(async (tx) => {
    const [purchase] = await tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!purchase) {
      throw new Error("Compra nao encontrada.");
    }

    if (purchase.status === "received") {
      throw new Error("Essa compra ja foi recebida.");
    }

    if (purchase.status === "canceled") {
      throw new Error("Nao e possivel receber uma compra cancelada.");
    }

    await lockProductRows(tx, [purchase.productId]);

    const [product] = await getLockedProducts(tx, [purchase.productId]);

    if (!product) {
      throw new Error("Produto da compra nao encontrado.");
    }

    const nextStock = product.currentStock + purchase.quantity;
    const nextAverageCost = calculateMovingAverageCost({
      currentAverageCost: toNumber(product.averageCost),
      currentStock: product.currentStock,
      incomingQuantity: purchase.quantity,
      incomingTotalCost: toNumber(purchase.totalCost),
    });

    await tx
      .update(products)
      .set({
        averageCost: toMoneyString(nextAverageCost),
        currentStock: nextStock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));

    await tx
      .update(purchases)
      .set({
        receivedAt: new Date(),
        status: "received",
        updatedAt: new Date(),
      })
      .where(eq(purchases.id, purchase.id));

    await tx.insert(inventoryMovements).values({
      createdByUserId,
      note: "Entrada gerada pelo recebimento da compra.",
      productId: product.id,
      purchaseId: purchase.id,
      quantityDelta: purchase.quantity,
      type: "purchase_in",
      unitCostSnapshot: purchase.unitCost,
    });
  });

export const cancelPurchase = async (purchaseId: number) => {
  const [purchase] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.id, purchaseId))
    .limit(1);

  if (!purchase) {
    throw new Error("Compra nao encontrada.");
  }

  if (purchase.status === "received") {
    throw new Error(
      "Cancelamento de compra recebida exige estorno explicito e ainda nao foi aberto."
    );
  }

  await db
    .update(purchases)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(purchases.id, purchaseId));
};

export const upsertSystemSettings = async (input: SettingsInput) => {
  const [existingSettings] = await db
    .select()
    .from(systemSettings)
    .orderBy(asc(systemSettings.id))
    .limit(1);

  const values = {
    estimatedFeePercent: toMoneyString(input.estimatedFeePercent),
    lowStockThreshold: input.lowStockThreshold,
    minimumMarginPercent: toMoneyString(input.minimumMarginPercent),
    staleProductDays: input.staleProductDays,
    targetMarginPercent: toMoneyString(input.targetMarginPercent),
    updatedAt: new Date(),
  };

  if (!existingSettings) {
    await db.insert(systemSettings).values(values);
    return;
  }

  await db
    .update(systemSettings)
    .set(values)
    .where(eq(systemSettings.id, existingSettings.id));
};

export const createSale = async (input: SaleInput, createdByUserId: string) =>
  db.transaction(async (tx) => {
    const mergedItems = new Map<number, SaleItemInput>();

    for (const item of input.items) {
      const existingItem = mergedItems.get(item.productId);

      if (existingItem) {
        existingItem.quantity += item.quantity;
        existingItem.unitSalePrice = item.unitSalePrice;
      } else {
        mergedItems.set(item.productId, { ...item });
      }
    }

    const normalizedItems = Array.from(mergedItems.values());
    const lockedProductIds = await lockProductRows(
      tx,
      normalizedItems.map((item) => item.productId)
    );
    const productRows = await getLockedProducts(tx, lockedProductIds);
    const productMap = new Map(
      productRows.map((product) => [product.id, product])
    );

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error(`Produto ${item.productId} nao encontrado.`);
      }

      if (product.currentStock < item.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }
    }

    const itemsSubtotal = calculateSaleItemsSubtotal(normalizedItems);
    const discountAmount = input.discountAmount ?? 0;
    const shippingChargedAmount = input.shippingChargedAmount ?? 0;
    const orderTotal = calculateSaleOrderTotal({
      discountAmount,
      itemsSubtotal,
      shippingChargedAmount,
    });
    validateSaleOrderTotal(orderTotal);

    const paymentLines = input.payments ?? [];
    const paymentGrossTotal = roundMoney(
      paymentLines.reduce((total, payment) => total + payment.grossAmount, 0)
    );

    if (paymentGrossTotal > orderTotal) {
      throw new Error("Os pagamentos nao podem ultrapassar o total da venda.");
    }

    const [sale] = await tx
      .insert(sales)
      .values({
        channel: input.channel.trim(),
        createdByUserId,
        discountAmount: toMoneyString(discountAmount),
        itemsSubtotal: toMoneyString(itemsSubtotal),
        notes: input.notes?.trim() || null,
        orderTotal: toMoneyString(orderTotal),
        paymentStatus: "unpaid",
        shippingChargedAmount: toMoneyString(shippingChargedAmount),
        status: "finalized",
      })
      .returning();

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        continue;
      }

      const costSnapshotUnit = toNumber(product.averageCost);
      const costSnapshotTotal = roundMoney(costSnapshotUnit * item.quantity);
      const lineSubtotal = roundMoney(item.quantity * item.unitSalePrice);

      await tx.insert(saleItems).values({
        costSnapshotTotal: toMoneyString(costSnapshotTotal),
        costSnapshotUnit: toMoneyString(costSnapshotUnit),
        lineSubtotal: toMoneyString(lineSubtotal),
        productId: product.id,
        quantity: item.quantity,
        saleId: sale.id,
        unitSalePrice: toMoneyString(item.unitSalePrice),
      });

      await tx.insert(inventoryMovements).values({
        createdByUserId,
        note: "Saida gerada pela confirmacao da venda.",
        productId: product.id,
        quantityDelta: item.quantity * -1,
        saleId: sale.id,
        type: "sale_out",
        unitCostSnapshot: toMoneyString(costSnapshotUnit),
      });

      await tx
        .update(products)
        .set({
          currentStock: product.currentStock - item.quantity,
          lastSoldAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));
    }

    for (const payment of paymentLines) {
      const normalizedPayment = normalizePaymentEventInput({
        ...payment,
        saleId: sale.id,
        type: "payment",
      });

      await tx.insert(paymentEvents).values({
        createdByUserId,
        dueDate: normalizedPayment.dueDate,
        effectiveDate: normalizedPayment.effectiveDate,
        feeAmount: toMoneyString(normalizedPayment.feeAmount),
        grossAmount: toMoneyString(normalizedPayment.grossAmount),
        method: payment.method,
        netAmount: toMoneyString(normalizedPayment.netAmount),
        notes: normalizedPayment.notes,
        saleId: sale.id,
        status: normalizedPayment.status,
        type: normalizedPayment.type,
      });
    }

    await recalculateSaleFinancials(tx, sale.id);
    return sale;
  });

export const cancelSale = async (saleId: number, createdByUserId: string) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`select id from sales where id = ${saleId} for update`);

    const [sale] = await tx
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!sale) {
      throw new Error("Venda nao encontrada.");
    }

    if (sale.status === "canceled") {
      throw new Error("Essa venda ja foi cancelada.");
    }

    const salePaymentRows = await tx
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.saleId, saleId));

    if (salePaymentRows.some((payment) => payment.status !== "canceled")) {
      throw new Error(
        "Nao e possivel cancelar uma venda que ja possui eventos financeiros."
      );
    }

    const items = await tx
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));
    await lockProductRows(
      tx,
      items.map((item) => item.productId)
    );

    for (const item of items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!product) {
        continue;
      }

      await tx.insert(inventoryMovements).values({
        createdByUserId,
        note: "Estorno de estoque por cancelamento da venda.",
        productId: product.id,
        quantityDelta: item.quantity,
        saleId,
        type: "cancel_restock",
        unitCostSnapshot: item.costSnapshotUnit,
      });

      await tx
        .update(products)
        .set({
          currentStock: product.currentStock + item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));
    }

    await tx
      .update(sales)
      .set({
        paymentStatus: "unpaid",
        receivedGrossTotal: toMoneyString(0),
        receivedNetTotal: toMoneyString(0),
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(sales.id, saleId));
  });

export const createPaymentEvent = async (
  input: PaymentEventInput,
  createdByUserId: string
) =>
  db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from sales where id = ${input.saleId} for update`
    );

    const [sale] = await tx
      .select()
      .from(sales)
      .where(eq(sales.id, input.saleId))
      .limit(1);

    if (!sale) {
      throw new Error("Venda nao encontrada.");
    }

    if (sale.status === "canceled") {
      throw new Error(
        "Nao e possivel registrar eventos em uma venda cancelada."
      );
    }

    const normalizedPayment = normalizePaymentEventInput(input);

    await tx.insert(paymentEvents).values({
      createdByUserId,
      dueDate: normalizedPayment.dueDate,
      effectiveDate: normalizedPayment.effectiveDate,
      feeAmount: toMoneyString(normalizedPayment.feeAmount),
      grossAmount: toMoneyString(normalizedPayment.grossAmount),
      method: input.method,
      netAmount: toMoneyString(normalizedPayment.netAmount),
      notes: normalizedPayment.notes,
      saleId: input.saleId,
      status: normalizedPayment.status,
      type: normalizedPayment.type,
    });

    await recalculateSaleFinancials(tx, input.saleId);
  });
