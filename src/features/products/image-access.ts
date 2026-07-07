import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, organization, products } from "@/db/schema";
import { getExpectedProductImageKeys } from "@/features/products/image-storage";

export const canReadProductImage = async ({
  organizationId,
  productId,
  userId,
  version,
}: {
  organizationId: string;
  productId: string;
  userId: string;
  version: number;
}): Promise<boolean> => {
  const [product, membership, activeOrganization] = await Promise.all([
    db.query.products.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        eq(products.imageVersion, version)
      ),
    }),
    db.query.member.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, userId)
      ),
    }),
    db.query.organization.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(organization.id, organizationId),
        eq(organization.status, "active")
      ),
    }),
  ]);

  return Boolean(product && membership && activeOrganization);
};

export const listReferencedProductImageKeys = async (): Promise<
  Set<string>
> => {
  const productRows = await db
    .select({
      id: products.id,
      imageVersion: products.imageVersion,
      organizationId: products.organizationId,
    })
    .from(products);

  return new Set(
    productRows.flatMap((product) =>
      product.imageVersion === null
        ? []
        : getExpectedProductImageKeys(
            product.organizationId,
            product.id,
            product.imageVersion
          )
    )
  );
};
