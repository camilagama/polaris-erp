import "server-only";

import {
  auditEvents,
  member,
  organization,
  productImages,
  products,
} from "@polaris/db/schema";
import {
  withInternalJobContext,
  withTenantContext,
} from "@polaris/db/tenant-context";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { ProductImageAsset } from "@/features/products/contracts";
import { getExpectedProductImageKeys } from "@/features/products/image-storage";
import { buildProductImageUrl } from "@/features/products/image-urls";
import { getOrganizationPlanEntitlements } from "@/lib/entitlements";

const getRandomProductImageVersion = (): number => {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
  return (randomValue % 2_147_483_646) + 1;
};

export const createProductImageVersion = (): number =>
  getRandomProductImageVersion();

export const appendProductImageMetadata = async ({
  actorUserId,
  blurDataUrl,
  height,
  organizationId,
  productId,
  version,
  width,
}: {
  actorUserId: string;
  blurDataUrl: string;
  height: number;
  organizationId: string;
  productId: string;
  version: number;
  width: number;
}): Promise<{ position: number }> =>
  withTenantContext(organizationId, async (tx) => {
    const lockedProduct = await tx.execute<{ id: string }>(sql`
      select id
      from products
      where id = ${productId}
        and organization_id = ${organizationId}
        and soft_deleted_at is null
      for update
    `);

    if (!lockedProduct.rows[0]) {
      throw new Error("Produto nao encontrado.");
    }

    const [entitlements, activeImages] = await Promise.all([
      getOrganizationPlanEntitlements(tx, organizationId),
      tx
        .select({ position: productImages.position })
        .from(productImages)
        .where(
          and(
            eq(productImages.organizationId, organizationId),
            eq(productImages.productId, productId),
            isNull(productImages.removedAt)
          )
        )
        .orderBy(asc(productImages.position)),
    ]);

    if (activeImages.length >= entitlements.maxImagesPerProduct) {
      throw new Error(
        `Limite de ${entitlements.maxImagesPerProduct} imagens por produto atingido.`
      );
    }

    const occupiedPositions = new Set(
      activeImages.map((image) => image.position)
    );
    let position = 0;

    while (occupiedPositions.has(position)) {
      position += 1;
    }

    await tx.insert(productImages).values({
      blurDataUrl,
      height,
      organizationId,
      position,
      productId,
      version,
      width,
    });
    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { position, version },
      organizationId,
      subjectId: productId,
      subjectType: "product_image",
      type: "product_image.added",
    });

    return { position };
  });

export const removeAdditionalProductImageMetadata = async ({
  actorUserId,
  organizationId,
  productId,
  version,
}: {
  actorUserId: string;
  organizationId: string;
  productId: string;
  version: number;
}): Promise<boolean> =>
  withTenantContext(organizationId, async (tx) => {
    const removedImages = await tx
      .update(productImages)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(productImages.organizationId, organizationId),
          eq(productImages.productId, productId),
          eq(productImages.version, version),
          isNull(productImages.removedAt),
          sql`${productImages.position} > 0`
        )
      )
      .returning({ id: productImages.id });

    if (removedImages.length === 0) {
      return false;
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { version },
      organizationId,
      subjectId: productId,
      subjectType: "product_image",
      type: "product_image.removed",
    });

    return true;
  });

export const getActiveProductImageGallery = async (
  organizationId: string,
  productId: string
): Promise<ProductImageAsset[]> => {
  const imageRows = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        blurDataUrl: productImages.blurDataUrl,
        height: productImages.height,
        position: productImages.position,
        version: productImages.version,
        width: productImages.width,
      })
      .from(productImages)
      .innerJoin(
        products,
        and(
          eq(productImages.organizationId, products.organizationId),
          eq(productImages.productId, products.id)
        )
      )
      .where(
        and(
          eq(productImages.organizationId, organizationId),
          eq(productImages.productId, productId),
          isNull(productImages.removedAt),
          isNull(products.softDeletedAt)
        )
      )
      .orderBy(asc(productImages.position))
  );

  return imageRows.map((image) => ({
    blurDataURL: image.blurDataUrl,
    detailUrl: buildProductImageUrl(
      organizationId,
      productId,
      image.version,
      "detail"
    ),
    height: image.height,
    tableUrl: buildProductImageUrl(
      organizationId,
      productId,
      image.version,
      "table"
    ),
    version: image.version,
    width: image.width,
  }));
};

export const getProductImageState = async (
  organizationId: string,
  productId: string
): Promise<{
  id: string;
  imageVersion: number | null;
} | null> => {
  const [product] = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        id: products.id,
        imageVersion: products.imageVersion,
      })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
          isNull(products.softDeletedAt)
        )
      )
      .limit(1)
  );

  return product ?? null;
};

export const replaceProductImageMetadata = async ({
  actorUserId,
  blurDataURL,
  height,
  newVersion,
  oldVersion,
  organizationId,
  productId,
  width,
}: {
  actorUserId: string;
  blurDataURL: string;
  height: number;
  newVersion: number;
  oldVersion: number | null;
  organizationId: string;
  productId: string;
  width: number;
}): Promise<boolean> => {
  const updatedProducts = await withTenantContext(
    organizationId,
    async (tx) => {
      const updatedRows = await tx
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
            isNull(products.softDeletedAt),
            oldVersion === null
              ? isNull(products.imageVersion)
              : eq(products.imageVersion, oldVersion)
          )
        )
        .returning({ id: products.id });

      if (updatedRows.length === 0) {
        return updatedRows;
      }

      if (oldVersion === null) {
        await tx.insert(productImages).values({
          blurDataUrl: blurDataURL,
          height,
          organizationId,
          position: 0,
          productId,
          version: newVersion,
          width,
        });
      } else {
        const galleryRows = await tx
          .update(productImages)
          .set({
            blurDataUrl: blurDataURL,
            height,
            version: newVersion,
            width,
          })
          .where(
            and(
              eq(productImages.organizationId, organizationId),
              eq(productImages.productId, productId),
              eq(productImages.position, 0),
              isNull(productImages.removedAt),
              eq(productImages.version, oldVersion)
            )
          )
          .returning({ id: productImages.id });

        if (galleryRows.length === 0) {
          throw new Error("Galeria de imagens inconsistente.");
        }
      }

      await tx.insert(auditEvents).values({
        actorUserId,
        metadata: {
          newVersion,
          oldVersion,
        },
        organizationId,
        subjectId: productId,
        subjectType: "product_image",
        type: "product_image.replaced",
      });

      return updatedRows;
    }
  );

  return updatedProducts.length > 0;
};

export const clearProductImageMetadata = async ({
  actorUserId,
  currentVersion,
  organizationId,
  productId,
}: {
  actorUserId: string;
  currentVersion: number;
  organizationId: string;
  productId: string;
}): Promise<boolean> => {
  const updatedProducts = await withTenantContext(
    organizationId,
    async (tx) => {
      const updatedRows = await tx
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
            isNull(products.softDeletedAt),
            eq(products.imageVersion, currentVersion)
          )
        )
        .returning({ id: products.id });

      if (updatedRows.length === 0) {
        return updatedRows;
      }

      const removedImageRows = await tx
        .update(productImages)
        .set({ removedAt: new Date() })
        .where(
          and(
            eq(productImages.organizationId, organizationId),
            eq(productImages.productId, productId),
            eq(productImages.position, 0),
            isNull(productImages.removedAt),
            eq(productImages.version, currentVersion)
          )
        )
        .returning({ id: productImages.id });

      if (removedImageRows.length === 0) {
        throw new Error("Galeria de imagens inconsistente.");
      }

      await tx.insert(auditEvents).values({
        actorUserId,
        metadata: {
          removedVersion: currentVersion,
        },
        organizationId,
        subjectId: productId,
        subjectType: "product_image",
        type: "product_image.removed",
      });

      return updatedRows;
    }
  );

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
  const [product, membership, activeOrganization] = await withTenantContext(
    organizationId,
    (tx) =>
      Promise.all([
        tx.query.products.findFirst({
          columns: {
            id: true,
          },
          where: and(
            eq(products.id, productId),
            eq(products.organizationId, organizationId),
            isNull(products.softDeletedAt),
            eq(products.imageVersion, version)
          ),
        }),
        tx.query.member.findFirst({
          columns: {
            id: true,
          },
          where: and(
            eq(member.organizationId, organizationId),
            eq(member.userId, userId)
          ),
        }),
        tx.query.organization.findFirst({
          columns: {
            id: true,
          },
          where: and(
            eq(organization.id, organizationId),
            eq(organization.status, "active")
          ),
        }),
      ])
  );

  return Boolean(product && membership && activeOrganization);
};

export const listReferencedProductImageKeys = async (): Promise<
  Set<string>
> => {
  const [productRows, galleryRows] = await withInternalJobContext(
    "product_image_reconcile",
    (tx) =>
      Promise.all([
        tx
          .select({
            id: products.id,
            imageVersion: products.imageVersion,
            organizationId: products.organizationId,
          })
          .from(products)
          .where(isNull(products.softDeletedAt)),
        tx
          .select({
            productId: productImages.productId,
            organizationId: productImages.organizationId,
            version: productImages.version,
          })
          .from(productImages)
          .innerJoin(
            products,
            and(
              eq(productImages.organizationId, products.organizationId),
              eq(productImages.productId, products.id)
            )
          )
          .where(
            and(isNull(productImages.removedAt), isNull(products.softDeletedAt))
          ),
      ])
  );

  return new Set([
    ...productRows.flatMap((product) =>
      product.imageVersion === null
        ? []
        : getExpectedProductImageKeys(
            product.organizationId,
            product.id,
            product.imageVersion
          )
    ),
    ...galleryRows.flatMap((image) =>
      getExpectedProductImageKeys(
        image.organizationId,
        image.productId,
        image.version
      )
    ),
  ]);
};
