import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ProductImageVariant } from "@/features/products/image-schema";
import {
  PRODUCT_IMAGE_PRESIGN_EXPIRES_IN_SECONDS,
  type ProductImageMimeType,
} from "@/features/products/image-schema";
import {
  buildProductImageObjectKey,
  isProductImageStorageConfigured,
} from "@/features/products/image-urls";
import { serverEnv } from "@/lib/env";

const PRODUCT_IMAGE_PREFIX = "products/";
const STAGING_IMAGE_PREFIX = "staging/";

const getRequiredStorageEnv = () => {
  const accessKeyId = serverEnv.R2_ACCESS_KEY_ID;
  const accountId = serverEnv.R2_ACCOUNT_ID;
  const publicBucket = serverEnv.R2_BUCKET_PUBLIC;
  const secretAccessKey = serverEnv.R2_SECRET_ACCESS_KEY;
  const stagingBucket = serverEnv.R2_BUCKET_STAGING;

  if (
    !(
      isProductImageStorageConfigured() &&
      accessKeyId &&
      accountId &&
      publicBucket &&
      secretAccessKey &&
      stagingBucket
    )
  ) {
    throw new Error(
      "As variaveis do R2 ainda nao foram configuradas para imagens de produto."
    );
  }

  return {
    accessKeyId,
    accountId,
    publicBucket,
    secretAccessKey,
    stagingBucket,
  };
};

const createStorageClient = () => {
  const env = getRequiredStorageEnv();

  return new S3Client({
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  });
};

let storageClient: S3Client | null = null;

const getStorageClient = () => {
  storageClient ??= createStorageClient();
  return storageClient;
};

const readBodyToBuffer = async (
  body:
    | {
        transformToByteArray: () => Promise<Uint8Array>;
      }
    | undefined
) => {
  if (!body) {
    throw new Error("A imagem staged nao possui conteudo.");
  }

  return Buffer.from(await body.transformToByteArray());
};

export const createStagingObjectKey = (userId: string) =>
  `${STAGING_IMAGE_PREFIX}${userId}/${crypto.randomUUID()}`;

export const createPresignedProductImageUpload = async ({
  contentType,
  objectKey,
}: {
  contentType: ProductImageMimeType;
  objectKey: string;
}) => {
  const env = getRequiredStorageEnv();
  const command = new PutObjectCommand({
    Bucket: env.stagingBucket,
    ContentType: contentType,
    Key: objectKey,
  });

  const uploadUrl = await getSignedUrl(getStorageClient(), command, {
    expiresIn: PRODUCT_IMAGE_PRESIGN_EXPIRES_IN_SECONDS,
  });

  return {
    expiresIn: PRODUCT_IMAGE_PRESIGN_EXPIRES_IN_SECONDS,
    requiredHeaders: {
      "Content-Type": contentType,
    },
    uploadUrl,
  };
};

export const readStagedProductImage = async ({
  contentType,
  objectKey,
  size,
}: {
  contentType: ProductImageMimeType;
  objectKey: string;
  size: number;
}) => {
  const env = getRequiredStorageEnv();
  if (!objectKey.startsWith(STAGING_IMAGE_PREFIX)) {
    throw new Error("Chave de upload temporario invalida.");
  }

  const head = await getStorageClient().send(
    new HeadObjectCommand({
      Bucket: env.stagingBucket,
      Key: objectKey,
    })
  );

  const expectedContentType = head.ContentType;
  const expectedSize = head.ContentLength;

  if (expectedContentType !== contentType) {
    throw new Error("O tipo da imagem enviada nao confere com o upload.");
  }

  if (typeof expectedSize === "number" && expectedSize !== size) {
    throw new Error("O tamanho da imagem enviada nao confere com o upload.");
  }

  const response = await getStorageClient().send(
    new GetObjectCommand({
      Bucket: env.stagingBucket,
      Key: objectKey,
    })
  );

  return await readBodyToBuffer(response.Body);
};

export const uploadProcessedProductImageVariant = async ({
  body,
  productId,
  variant,
  version,
}: {
  body: Buffer;
  productId: string;
  variant: ProductImageVariant;
  version: number;
}) => {
  const env = getRequiredStorageEnv();
  const key = buildProductImageObjectKey(productId, version, variant);

  await getStorageClient().send(
    new PutObjectCommand({
      Body: body,
      Bucket: env.publicBucket,
      CacheControl: "public, max-age=31536000, immutable",
      ContentType: "image/webp",
      Key: key,
    })
  );

  return key;
};

export const deleteObjectIfExists = async ({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) => {
  await getStorageClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};

export const deleteProductImageVersion = async ({
  productId,
  version,
}: {
  productId: string;
  version: number;
}) => {
  const env = getRequiredStorageEnv();
  await getStorageClient().send(
    new DeleteObjectsCommand({
      Bucket: env.publicBucket,
      Delete: {
        Objects: (["detail", "table"] as const).map((variant) => ({
          Key: buildProductImageObjectKey(productId, version, variant),
        })),
        Quiet: true,
      },
    })
  );
};

export const listAllStoredProductImageKeys = async () => {
  const env = getRequiredStorageEnv();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await getStorageClient().send(
      new ListObjectsV2Command({
        Bucket: env.publicBucket,
        ContinuationToken: continuationToken,
        Prefix: PRODUCT_IMAGE_PREFIX,
      })
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
};

export const deleteManyProductImageKeys = async (keys: string[]) => {
  const env = getRequiredStorageEnv();
  const client = getStorageClient();

  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);

    if (chunk.length === 0) {
      continue;
    }

    await client.send(
      new DeleteObjectsCommand({
        Bucket: env.publicBucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: true,
        },
      })
    );
  }
};

export const getExpectedProductImageKeys = (
  productId: string,
  version: number
) =>
  (["detail", "table"] as const).map((variant) =>
    buildProductImageObjectKey(productId, version, variant)
  );
