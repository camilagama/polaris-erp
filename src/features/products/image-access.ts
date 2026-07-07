import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { member, organization, products } from "@/db/schema";
import { getExpectedProductImageKeys } from "@/features/products/image-storage";

export const getProductImageState = async (
  organizationId: string,
  productId: string
): Promise<{
  id: string;
  imageVersion: number | null;
} | null> => {
  const [product] = await db
    .select({
      id: products.id,
      imageVersion: products.imageVersion,
    })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId)
      )
    )
    .limit(1);

  return product ?? null;
};

export const replaceProductImageMetadata = async ({
  blurDataURL,
  height,
  newVersion,
  oldVersion,
  organizationId,
  productId,
  width,
}: {
  blurDataURL: string;
  height: number;
  newVersion: number;
  oldVersion: number | null;
  organizationId: string;
  productId: string;
  width: number;
}): Promise<boolean> => {
  const updatedProducts = await db
    .update(products)
    .set({
      imageBlurDataUrl: blurDataURL,
      imageHeight: height,
      imageUploadedAt: new Date(),
      imageVersion: newVersion,
      imageWidth: width,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        oldVersion === null
          ? isNull(products.imageVersion)
          : eq(products.imageVersion, oldVersion)
      )
    )
    .returning({ id: products.id });

  return updatedProducts.length > 0;
};

export const clearProductImageMetadata = async ({
  currentVersion,
  organizationId,
  productId,
}: {
  currentVersion: number;
  organizationId: string;
  productId: string;
}): Promise<boolean> => {
  const updatedProducts = await db
    .update(products)
    .set({
      imageBlurDataUrl: null,
      imageHeight: null,
      imageUploadedAt: null,
      imageVersion: null,
      imageWidth: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        eq(products.imageVersion, currentVersion)
      )
    )
    .returning({ id: products.id });

  return updatedProducts.length > 0;
};

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
