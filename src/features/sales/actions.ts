"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCatalogSettings } from "@/features/catalog/server";
import { createSaleSchema } from "@/features/sales/schema";
import {
  cancelSale,
  createSale,
  findExistingSaleByIdempotencyKey,
} from "@/features/sales/server";
import { requireAppContext } from "@/lib/app-session";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

const SALES_IDEMPOTENCY_CONSTRAINT =
  "sales_organization_idempotency_key_unique_idx";

const revalidateSalesViews = (organizationId: string) => {
  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/produtos/[id]", "page");
  updateTag(buildOrganizationCacheTags(organizationId).analytics);
};

const revalidateSaleDetail = (saleId: string) => {
  revalidatePath(`/vendas/${saleId}`);
};

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
  idempotencyKey?: string;
  notes?: string;
  occurredOn: string;
  paymentFeePayer: "customer" | "not_applicable" | "seller";
  paymentInstallments: number;
  paymentMethod: "card" | "pix";
}): Promise<string> {
  const context = await requireAppContext("sales:write");
  const parsed = createSaleSchema.parse(data);
  const existingSaleId = await findExistingSaleByIdempotencyKey(
    context.organizationId,
    parsed.idempotencyKey
  );

  if (existingSaleId) {
    return existingSaleId;
  }

  const catalogSettings = await getCatalogSettings(context.organizationId);

  let createdSaleId: string;

  try {
    createdSaleId = await createSale({
      actorUserId: context.userId,
      cardInstallmentRules: catalogSettings.cardInstallmentRules,
      input: parsed,
      organizationId: context.organizationId,
    });
  } catch (error) {
    if (isIdempotencyConflict(error)) {
      const concurrentSaleId = await findExistingSaleByIdempotencyKey(
        context.organizationId,
        parsed.idempotencyKey
      );

      if (concurrentSaleId) {
        return concurrentSaleId;
      }
    }

    throw error;
  }

  revalidateSalesViews(context.organizationId);
  revalidateSaleDetail(createdSaleId);
  return createdSaleId;
}

export async function cancelSaleAction(id: string) {
  const context = await requireAppContext("sales:write");

  await cancelSale({
    actorUserId: context.userId,
    organizationId: context.organizationId,
    saleId: id,
  });

  revalidateSalesViews(context.organizationId);
  revalidateSaleDetail(id);
}
