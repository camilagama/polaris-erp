import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryMovements,
  products,
  purchases,
  systemSettings,
} from "@/db/schema";
import {
  calculateMovingAverageCost,
  calculatePurchaseTotal,
  calculatePurchaseUnitCost,
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
