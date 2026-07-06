import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  HeadBucketCommand,
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

const PRODUCT_IMAGE_PREFIX = "organizations/";
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
    requestChecksumCalculation: "WHEN_REQUIRED",
    region: "auto",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
};

let storageClient: S3Client | null = null;

const getStorageClient = () => {
  storageClient ??= createStorageClient();
  return storageClient;
};

const assertBatchDeleteSucceeded = (
  result: { Errors?: { Code?: string; Key?: string }[] },
  context: string
) => {
  const errors = result.Errors ?? [];
  if (errors.length === 0) {
    return;
  }

  const detail = errors
    .map((entry) => `${entry.Key ?? "?"}:${entry.Code ?? "?"}`)
    .join(", ");
  throw new Error(`${context}: falha(s) no R2: ${detail}`);
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
  size,
}: {
  contentType: ProductImageMimeType;
  objectKey: string;
  size: number;
}) => {
  const env = getRequiredStorageEnv();
  const command = new PutObjectCommand({
    Bucket: env.stagingBucket,
    ContentLength: size,
    ContentType: contentType,
    Key: objectKey,
  });

  const uploadUrl = await getSignedUrl(getStorageClient(), command, {
    expiresIn: PRODUCT_IMAGE_PRESIGN_EXPIRES_IN_SECONDS,
  });

  return {
    expiresIn: PRODUCT_IMAGE_PRESIGN_EXPIRES_IN_SECONDS,
    /**
     * Do not send `Content-Length` from JS: browsers treat it as a forbidden
     * request header, but still set it automatically to match the request body
     * (must equal `size` for this presigned PUT).
     */
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
  userId,
}: {
  contentType: ProductImageMimeType;
  objectKey: string;
  size: number;
  userId: string;
}) => {
  const env = getRequiredStorageEnv();
  const expectedPrefix = `${STAGING_IMAGE_PREFIX}${userId}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
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

export const readPublicProductImageVariant = async ({
  organizationId,
  productId,
  variant,
  version,
}: {
  organizationId: string;
  productId: string;
  variant: ProductImageVariant;
  version: number;
}) => {
  const env = getRequiredStorageEnv();
  const key = buildProductImageObjectKey(
    organizationId,
    productId,
    version,
    variant
  );

  const response = await getStorageClient().send(
    new GetObjectCommand({
      Bucket: env.publicBucket,
      Key: key,
    })
  );

  return {
    body: await readBodyToBuffer(response.Body),
    cacheControl:
      response.CacheControl ?? "public, max-age=31536000, immutable",
    contentType: response.ContentType ?? "image/webp",
    etag: response.ETag ?? null,
  };
};

export const uploadProcessedProductImageVariant = async ({
  body,
  organizationId,
  productId,
  variant,
  version,
}: {
  body: Buffer;
  organizationId: string;
  productId: string;
  variant: ProductImageVariant;
  version: number;
}) => {
  const env = getRequiredStorageEnv();
  const key = buildProductImageObjectKey(
    organizationId,
    productId,
    version,
    variant
  );

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
  organizationId,
  productId,
  version,
}: {
  organizationId: string;
  productId: string;
  version: number;
}) => {
  const env = getRequiredStorageEnv();
  const result = await getStorageClient().send(
    new DeleteObjectsCommand({
      Bucket: env.publicBucket,
      Delete: {
        Objects: (["detail", "table"] as const).map((variant) => ({
          Key: buildProductImageObjectKey(
            organizationId,
            productId,
            version,
            variant
          ),
        })),
        Quiet: true,
      },
    })
  );
  assertBatchDeleteSucceeded(
    result,
    `deleteProductImageVersion(${organizationId}/${productId}, v${version})`
  );
};

export interface StoredProductImageObject {
  key: string;
  lastModified: Date | null;
}

export const listAllStoredProductImageObjects = async () => {
  const env = getRequiredStorageEnv();
  const objects: StoredProductImageObject[] = [];
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
        objects.push({
          key: item.Key,
          lastModified: item.LastModified ?? null,
        });
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
};

export const listAllStoredProductImageKeys = async () =>
  (await listAllStoredProductImageObjects()).map((object) => object.key);

export const deleteManyProductImageKeys = async (keys: string[]) => {
  const env = getRequiredStorageEnv();
  const client = getStorageClient();

  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);

    if (chunk.length === 0) {
      continue;
    }

    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: env.publicBucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: true,
        },
      })
    );
    assertBatchDeleteSucceeded(
      result,
      `deleteManyProductImageKeys(offset=${index})`
    );
  }
};

export const getExpectedProductImageKeys = (
  organizationId: string,
  productId: string,
  version: number
) =>
  (["detail", "table"] as const).map((variant) =>
    buildProductImageObjectKey(organizationId, productId, version, variant)
  );

export interface R2StagingHealthCorsRule {
  allowedHeaders: string[];
  allowedMethods: string[];
  allowedOrigins: string[];
  exposeHeaders: string[];
  maxAgeSeconds?: number;
}

export interface R2StagingHealthDiagnostics {
  configured: boolean;
  ok: boolean;
  publicBucket?: string;
  r2EndpointHost?: string;
  stagingBucket?: string;
  stagingCors?:
    | { ok: true; rules: R2StagingHealthCorsRule[] }
    | { code?: string; message: string; ok: false };
  stagingHead?: { ok: true } | { code?: string; message: string; ok: false };
  summary?: string;
  timestamp: string;
}

const errorMessageFromUnknown = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const errorNameFromUnknown = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

const headStagingBucketForHealth = async ({
  bucket,
  client,
}: {
  bucket: string;
  client: S3Client;
}): Promise<R2StagingHealthDiagnostics["stagingHead"]> => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (error) {
    return {
      code: errorNameFromUnknown(error),
      message: errorMessageFromUnknown(error),
      ok: false,
    };
  }
};

const readStagingCorsForHealth = async ({
  bucket,
  client,
}: {
  bucket: string;
  client: S3Client;
}): Promise<R2StagingHealthDiagnostics["stagingCors"]> => {
  try {
    const corsResponse = await client.send(
      new GetBucketCorsCommand({ Bucket: bucket })
    );
    const rules: R2StagingHealthCorsRule[] = (corsResponse.CORSRules ?? []).map(
      (rule) => ({
        allowedHeaders: [...(rule.AllowedHeaders ?? [])],
        allowedMethods: [...(rule.AllowedMethods ?? [])],
        allowedOrigins: [...(rule.AllowedOrigins ?? [])],
        exposeHeaders: [...(rule.ExposeHeaders ?? [])],
        maxAgeSeconds: rule.MaxAgeSeconds,
      })
    );
    return { ok: true, rules };
  } catch (error) {
    return {
      code: errorNameFromUnknown(error),
      message: errorMessageFromUnknown(error),
      ok: false,
    };
  }
};

const hasCorsOriginsConfigured = (
  stagingCors: R2StagingHealthDiagnostics["stagingCors"]
): boolean =>
  stagingCors?.ok === true &&
  stagingCors.rules.length > 0 &&
  stagingCors.rules.some((rule) => rule.allowedOrigins.length > 0);

const buildR2StagingHealthSummary = ({
  stagingCors,
  stagingHead,
}: {
  stagingCors: R2StagingHealthDiagnostics["stagingCors"];
  stagingHead: R2StagingHealthDiagnostics["stagingHead"];
}): string => {
  if (!stagingHead?.ok) {
    return "Bucket de staging inacessivel ou credenciais invalidas.";
  }

  if (!stagingCors?.ok) {
    return "Nao foi possivel ler a politica CORS do bucket de staging (pode estar ausente).";
  }

  if (stagingCors.rules.length === 0) {
    return "CORS do bucket de staging sem regras.";
  }

  if (stagingCors.rules.some((rule) => rule.allowedOrigins.length > 0)) {
    return "R2 staging acessivel e CORS legivel; confira se AllowedOrigins inclui a origem exata do app.";
  }

  return "CORS do bucket de staging sem AllowedOrigins.";
};

/**
 * Diagnóstico operacional do R2 (staging): credenciais, bucket acessível e CORS atual.
 * Não expõe chaves nem segredos.
 */
export const getR2StagingHealthDiagnostics =
  async (): Promise<R2StagingHealthDiagnostics> => {
    const timestamp = new Date().toISOString();

    if (!isProductImageStorageConfigured()) {
      return {
        configured: false,
        ok: false,
        summary:
          "Variaveis R2 incompletas ou imagens de produto nao configuradas (ver isProductImageStorageConfigured).",
        timestamp,
      };
    }

    const env = getRequiredStorageEnv();
    const r2EndpointHost = `${env.accountId}.r2.cloudflarestorage.com`;
    const client = getStorageClient();

    const stagingHead = await headStagingBucketForHealth({
      bucket: env.stagingBucket,
      client,
    });
    const stagingCors = await readStagingCorsForHealth({
      bucket: env.stagingBucket,
      client,
    });

    const corsOk = hasCorsOriginsConfigured(stagingCors);
    const ok = stagingHead?.ok === true && corsOk;
    const summary = buildR2StagingHealthSummary({ stagingCors, stagingHead });

    return {
      configured: true,
      ok,
      publicBucket: env.publicBucket,
      r2EndpointHost,
      stagingBucket: env.stagingBucket,
      stagingCors,
      stagingHead,
      summary,
      timestamp,
    };
  };
