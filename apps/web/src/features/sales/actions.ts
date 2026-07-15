"use server";

import { getCatalogSettings } from "@/features/catalog/server";
import type { PaginatedSaleProductOptions } from "@/features/sales/queries";
import { getSaleProductsQuery } from "@/features/sales/queries";
import { createSaleSchema } from "@/features/sales/schema";
import { cancelSale, createSaleOnce } from "@/features/sales/server";
import { requireAppContext } from "@/lib/app-session";
import { saleChanged } from "@/lib/domain-invalidation";

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
  const result = await createSaleOnce({
    actorUserId: context.userId,
    input: parsed,
    loadCardInstallmentRules: async () => {
      const catalogSettings = await getCatalogSettings(context.organizationId);
      return catalogSettings.cardInstallmentRules;
    },
    organizationId: context.organizationId,
  });

  if (!result.created) {
    return result.saleId;
  }

  saleChanged({
    organizationId: context.organizationId,
    saleId: result.saleId,
  });
  return result.saleId;
}

export async function cancelSaleAction(
  id: string,
  idempotencyKey = crypto.randomUUID()
) {
  const context = await requireAppContext("sales:write");

  await cancelSale({
    actorUserId: context.userId,
    idempotencyKey,
    organizationId: context.organizationId,
    saleId: id,
  });

  saleChanged({
    organizationId: context.organizationId,
    saleId: id,
  });
}

export async function searchSaleProductOptionsAction({
  cursor,
  query,
}: {
  cursor?: string;
  query?: string;
}): Promise<PaginatedSaleProductOptions> {
  const context = await requireAppContext("sales:write");

  return getSaleProductsQuery({
    cursor,
    organizationId: context.organizationId,
    query,
  });
}
