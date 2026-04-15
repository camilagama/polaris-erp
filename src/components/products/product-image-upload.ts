"use client";

import {
  PRODUCT_IMAGE_MAX_BYTES,
  productImageMimeTypes,
  type StagedProductImageInput,
} from "@/features/products/image-schema";

const supportedMimeTypes = new Set<string>(productImageMimeTypes);

const OPAQUE_FETCH_FAILURE_PATTERN =
  /failed to fetch|load failed|networkerror|network request failed/i;

const isLikelyOpaqueBrowserFetchFailure = (message: string): boolean =>
  OPAQUE_FETCH_FAILURE_PATTERN.test(message.trim());

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
      const detail = error.message.trim();
      if (isLikelyOpaqueBrowserFetchFailure(detail)) {
        throw new Error(
          "O navegador bloqueou o envio para o R2 (comum: CORS no bucket de staging sem a origem exata deste site, ou rede/offline). Confira a aba Network no PUT para *.r2.cloudflarestorage.com e docs/product-images-r2.md."
        );
      }

      throw new Error(
        `Nao foi possivel contatar o endpoint de upload do R2 (${detail}). Verifique rede, VPN e extensoes; se o PUT aparecer sem status HTTP, revise tambem o CORS do bucket de staging.`
      );
    }

    throw error;
  }

  if (!uploadResponse.ok) {
    const bodyText = await uploadResponse.text().catch(() => "");
    const trimmed = bodyText.trim().slice(0, 200);
    const suffix = trimmed.length > 0 ? ` — ${trimmed}` : "";
    throw new Error(
      `Nao foi possivel enviar a imagem para o armazenamento (HTTP ${uploadResponse.status}${suffix}).`
    );
  }

  return {
    contentType: file.type as StagedProductImageInput["contentType"],
    objectKey: presignPayload.objectKey,
    size: file.size,
  };
};
