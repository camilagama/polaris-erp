import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryMovements,
  products,
  purchases,
  receipts,
  saleItems,
  sales,
  systemSettings,
} from "@/db/schema";
import {
  calculateMovingAverageCost,
  calculatePurchaseTotal,
  calculatePurchaseUnitCost,
  calculateReceiptNetAmount,
  calculateSaleItemsSubtotal,
  calculateSaleOrderTotal,
  deriveSaleStatus,
  roundMoney,
  toNumber,
} from "@/lib/domain/calculations";

const toMoneyString = (value: number) => roundMoney(value).toFixed(2);

interface ProductInput {
  category?: string;
  description?: string;
  name: string;
  notes?: string;
}

interface InventoryAdjustmentInput {
  note?: string;
  productId: number;
  quantity: number;
  type: "adjustment_plus" | "adjustment_minus" | "damage" | "loss";
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

interface SaleInput {
  channel: string;
  discountAmount?: number;
  items: SaleItemInput[];
  notes?: string;
  shippingChargedAmount?: number;
}

interface ReceiptInput {
  dueDate?: Date | null;
  effectiveDate?: Date | null;
  feeAmount?: number;
  grossAmount: number;
  method: "pix" | "cash" | "card" | "payment_link";
  notes?: string;
  saleId: number;
  status:
    | "pending"
    | "partial"
    | "received"
    | "canceled"
    | "refunded"
    | "chargeback";
}

export const createProduct = async (
  input: ProductInput,
  createdByUserId: string
) =>
  db
    .insert(products)
    .values({
      category: input.category || null,
      createdByUserId,
      description: input.description || null,
      name: input.name,
      notes: input.notes || null,
    })
    .returning();

export const updateProductStatus = async (
  productId: number,
  status: "active" | "inactive"
) =>
  db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(eq(products.id, productId));

export const createInventoryAdjustment = async (
  input: InventoryAdjustmentInput,
  createdByUserId: string
) =>
  db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const normalizedQuantity =
      input.type === "adjustment_plus" ? input.quantity : input.quantity * -1;
    const nextStock = product.currentStock + normalizedQuantity;

    if (nextStock < 0) {
      throw new Error("O ajuste deixaria o estoque negativo.");
    }

    await tx.insert(inventoryMovements).values({
      createdByUserId,
      note: input.note || null,
      productId: product.id,
      quantityDelta: normalizedQuantity,
      type: input.type,
      unitCostSnapshot: toMoneyString(toNumber(product.averageCost)),
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
    notes: input.notes || null,
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

    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, purchase.productId))
      .limit(1);

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

const recalculateSaleFinancials = async (saleId: number) => {
  const [sale] = await db
    .select()
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) {
    throw new Error("Venda nao encontrada.");
  }

  const saleReceiptRows = await db
    .select()
    .from(receipts)
    .where(eq(receipts.saleId, saleId));

  const effectiveReceipts = saleReceiptRows.filter(
    (receipt) => receipt.status !== "pending" && receipt.status !== "canceled"
  );
  const receivedGrossTotal = effectiveReceipts.reduce(
    (total, receipt) => total + toNumber(receipt.grossAmount),
    0
  );
  const receivedNetTotal = effectiveReceipts.reduce(
    (total, receipt) => total + toNumber(receipt.netAmount),
    0
  );
  const nextStatus = deriveSaleStatus({
    hasChargeback: effectiveReceipts.some(
      (receipt) => receipt.status === "chargeback"
    ),
    hasRefund: effectiveReceipts.some(
      (receipt) => receipt.status === "refunded"
    ),
    orderTotal: toNumber(sale.orderTotal),
    receivedGrossTotal,
  });

  await db
    .update(sales)
    .set({
      receivedGrossTotal: toMoneyString(receivedGrossTotal),
      receivedNetTotal: toMoneyString(receivedNetTotal),
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(sales.id, saleId));
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
    const productRows = await tx.select().from(products);
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

    const [sale] = await tx
      .insert(sales)
      .values({
        channel: input.channel,
        createdByUserId,
        discountAmount: toMoneyString(discountAmount),
        itemsSubtotal: toMoneyString(itemsSubtotal),
        notes: input.notes || null,
        orderTotal: toMoneyString(orderTotal),
        shippingChargedAmount: toMoneyString(shippingChargedAmount),
        status: "awaiting_payment",
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

    return sale;
  });

export const cancelSale = async (saleId: number, createdByUserId: string) =>
  db.transaction(async (tx) => {
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

    if (toNumber(sale.receivedGrossTotal) > 0) {
      throw new Error(
        "Nao e possivel cancelar uma venda que ja possui recebimentos."
      );
    }

    const items = await tx
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

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
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(sales.id, saleId));
  });

export const createReceipt = async (
  input: ReceiptInput,
  createdByUserId: string
) => {
  const [sale] = await db
    .select()
    .from(sales)
    .where(eq(sales.id, input.saleId))
    .limit(1);

  if (!sale) {
    throw new Error("Venda nao encontrada.");
  }

  const grossAmount = input.grossAmount;
  const feeAmount = input.feeAmount ?? 0;
  const netAmount = calculateReceiptNetAmount(grossAmount, feeAmount);

  await db.insert(receipts).values({
    createdByUserId,
    dueDate: input.dueDate ?? null,
    effectiveDate: input.effectiveDate ?? null,
    feeAmount: toMoneyString(feeAmount),
    grossAmount: toMoneyString(grossAmount),
    method: input.method,
    netAmount: toMoneyString(netAmount),
    notes: input.notes || null,
    saleId: input.saleId,
    status: input.status,
  });

  await recalculateSaleFinancials(input.saleId);
};
