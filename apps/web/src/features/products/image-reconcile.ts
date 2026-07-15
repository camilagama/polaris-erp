import "server-only";

import { listReferencedProductImageKeys } from "@/features/products/image-access";
import { listAllStoredProductImageObjects } from "@/features/products/image-storage";

export interface ProductImageReconcileResult {
  deletedCount: number;
  orphanedCount: number;
  retentionPendingCount: number;
  scannedCount: number;
  skippedRecentCount: number;
}

export const reconcileProductImages =
  async (): Promise<ProductImageReconcileResult> => {
    const [storedObjects, expectedKeys] = await Promise.all([
      listAllStoredProductImageObjects(),
      listReferencedProductImageKeys(),
    ]);

    const orphanedObjects = storedObjects.filter(
      (object) => !expectedKeys.has(object.key)
    );

    return {
      deletedCount: 0,
      orphanedCount: orphanedObjects.length,
      retentionPendingCount: orphanedObjects.length,
      scannedCount: storedObjects.length,
      skippedRecentCount: 0,
    };
  };
