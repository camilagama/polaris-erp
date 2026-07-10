import "server-only";

import { listReferencedProductImageKeys } from "@/features/products/image-access";
import {
  deleteManyProductImageKeys,
  listAllStoredProductImageObjects,
} from "@/features/products/image-storage";

const PRODUCT_IMAGE_RECONCILE_MIN_AGE_MS = 15 * 60 * 1000;

export interface ProductImageReconcileResult {
  deletedCount: number;
  orphanedCount: number;
  scannedCount: number;
  skippedRecentCount: number;
}

const isOldEnoughForReconcileDelete = (
  lastModified: Date | null,
  now: Date
): boolean =>
  lastModified !== null &&
  now.getTime() - lastModified.getTime() >= PRODUCT_IMAGE_RECONCILE_MIN_AGE_MS;

export const reconcileProductImages =
  async (): Promise<ProductImageReconcileResult> => {
    const [storedObjects, expectedKeys] = await Promise.all([
      listAllStoredProductImageObjects(),
      listReferencedProductImageKeys(),
    ]);

    const now = new Date();
    const orphanedObjects = storedObjects.filter(
      (object) => !expectedKeys.has(object.key)
    );
    const orphanedKeys = orphanedObjects
      .filter((object) =>
        isOldEnoughForReconcileDelete(object.lastModified, now)
      )
      .map((object) => object.key);

    await deleteManyProductImageKeys(orphanedKeys);

    return {
      deletedCount: orphanedKeys.length,
      orphanedCount: orphanedObjects.length,
      scannedCount: storedObjects.length,
      skippedRecentCount: orphanedObjects.length - orphanedKeys.length,
    };
  };
