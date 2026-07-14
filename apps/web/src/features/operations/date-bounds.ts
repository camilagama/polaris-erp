import "server-only";

import { productStockEntries, sales } from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";
import { formatDateInputValue } from "@/lib/domain/date";

export interface OperationalDateBounds {
  from: string;
  to: string;
}

export const getOperationalDateBounds = async (
  organizationId: string
): Promise<OperationalDateBounds> => {
  "use cache: remote";
  cacheTag(buildOrganizationCacheTags(organizationId).analytics);
  cacheLife("minutes");

  const [salesRows, stockEntriesRows] = await withTenantContext(
    organizationId,
    async (tx) => {
      const salesResult = await tx
        .select({
          minOccurredOn: sql<string | null>`min(${sales.occurredOn})`,
        })
        .from(sales)
        .where(eq(sales.organizationId, organizationId));
      const stockEntriesResult = await tx
        .select({
          minStockedOn: sql<
            string | null
          >`min(${productStockEntries.stockedOn})`,
        })
        .from(productStockEntries)
        .where(eq(productStockEntries.organizationId, organizationId));

      return [salesResult, stockEntriesResult] as const;
    }
  );
  const today = formatDateInputValue();
  const earliestMovementDate = [
    salesRows[0]?.minOccurredOn,
    stockEntriesRows[0]?.minStockedOn,
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))[0];

  return {
    from: earliestMovementDate ?? today,
    to: today,
  };
};
