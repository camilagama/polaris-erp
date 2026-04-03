"use client";

import {
  PRODUCT_IMAGE_MAX_BYTES,
  productImageMimeTypes,
  type StagedProductImageInput,
} from "@/features/products/image-schema";

const supportedMimeTypes = new Set<string>(productImageMimeTypes);

const validateProductImageFile = (file: File) => {
  if (!supportedMimeTypes.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WebP.");
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("A imagem excede o limite de 10 MB.");
  }
};

export const uploadProductImageToStaging = async (
  file: File
): Promise<StagedProductImageInput> => {
  validateProductImageFile(file);

  const presignResponse = await fetch("/api/product-images/presign", {
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const presignPayload = (await presignResponse.json().catch(() => null)) as {
    error?: string;
    objectKey?: string;
    requiredHeaders?: Record<string, string>;
    uploadUrl?: string;
  } | null;

  if (
    !(
      presignResponse.ok &&
      presignPayload?.uploadUrl &&
      presignPayload.objectKey
    )
  ) {
    throw new Error(
      presignPayload?.error ?? "Nao foi possivel preparar o upload da imagem."
    );
  }

  let uploadResponse: Response;

  try {
    uploadResponse = await fetch(presignPayload.uploadUrl, {
      body: file,
      headers: presignPayload.requiredHeaders,
      method: "PUT",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "O navegador nao conseguiu enviar a imagem ao R2. Verifique o CORS do bucket de staging para o origin atual."
      );
    }

    throw error;
  }

  if (!uploadResponse.ok) {
    throw new Error("Nao foi possivel enviar a imagem para o armazenamento.");
  }

  return {
    contentType: file.type as StagedProductImageInput["contentType"],
    objectKey: presignPayload.objectKey,
    size: file.size,
  };
};
