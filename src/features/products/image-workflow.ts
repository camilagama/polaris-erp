import "server-only";

import { processProductImage } from "@/features/products/image-processing";
import type { StagedProductImageInput } from "@/features/products/image-schema";
import {
  deleteObjectIfExists,
  deleteProductImageVersion,
  readStagedProductImage,
  uploadProcessedProductImageVariant,
} from "@/features/products/image-storage";
import { serverEnv } from "@/lib/env";

interface StoredProductImageResult {
  blurDataURL: string;
  height: number;
  version: number;
  width: number;
}

export const storeProductImageFromStage = async ({
  organizationId,
  productId,
  stagedImage,
  userId,
  version,
}: {
  organizationId: string;
  productId: string;
  stagedImage: StagedProductImageInput;
  userId: string;
  version: number;
}): Promise<StoredProductImageResult> => {
  let uploadedNewVersion = false;

  try {
    const stagedBuffer = await readStagedProductImage({
      contentType: stagedImage.contentType,
      objectKey: stagedImage.objectKey,
      size: stagedImage.size,
      userId,
    });
    const processed = await processProductImage(stagedBuffer);

    await Promise.all([
      uploadProcessedProductImageVariant({
        body: processed.detail.buffer,
        organizationId,
        productId,
        variant: "detail",
        version,
      }),
      uploadProcessedProductImageVariant({
        body: processed.table.buffer,
        organizationId,
        productId,
        variant: "table",
        version,
      }),
    ]);

    uploadedNewVersion = true;

    return {
      blurDataURL: processed.blurDataURL,
      height: processed.detail.height,
      version,
      width: processed.detail.width,
    };
  } catch (error) {
    if (uploadedNewVersion) {
      await deleteProductImageVersion({
        organizationId,
        productId,
        version,
      }).catch(() => undefined);
    }

    throw error;
  } finally {
    if (serverEnv.R2_BUCKET_STAGING) {
      await deleteObjectIfExists({
        bucket: serverEnv.R2_BUCKET_STAGING,
        key: stagedImage.objectKey,
      }).catch(() => undefined);
    }
  }
};
