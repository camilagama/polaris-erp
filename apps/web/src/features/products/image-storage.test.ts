import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const storageMocks = vi.hoisted(() => {
  class Command {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    command: Command,
    getSignedUrl: vi.fn(),
    send: vi.fn(),
    serverEnv: {
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      R2_ACCESS_KEY_ID: "access",
      R2_ACCOUNT_ID: "account",
      R2_BUCKET_FINAL: "final" as string | undefined,
      R2_BUCKET_STAGING: "staging",
      R2_SECRET_ACCESS_KEY: "secret",
    },
  };
});

vi.mock("@/lib/env", () => ({
  serverEnv: storageMocks.serverEnv,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: storageMocks.getSignedUrl,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: storageMocks.command,
  DeleteObjectsCommand: storageMocks.command,
  GetBucketCorsCommand: storageMocks.command,
  GetObjectCommand: storageMocks.command,
  HeadBucketCommand: storageMocks.command,
  HeadObjectCommand: storageMocks.command,
  ListObjectsV2Command: storageMocks.command,
  PutObjectCommand: storageMocks.command,
  S3Client: class {
    send = storageMocks.send;
  },
}));

const TENANT_SCOPED_STAGING_KEY_PATTERN =
  /^staging\/org_dg_imports\/user-1\/.+/;

describe("product image R2 storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.serverEnv.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    storageMocks.serverEnv.R2_BUCKET_FINAL = "final";
  });

  it("scopes staged object keys by organization and user", async () => {
    const { createStagingObjectKey } = await import(
      "@/features/products/image-storage"
    );

    const key = createStagingObjectKey("org_dg_imports", "user-1");

    expect(key).toMatch(TENANT_SCOPED_STAGING_KEY_PATTERN);
  });

  it("writes processed variants to the final bucket", async () => {
    const { uploadProcessedProductImageVariant } = await import(
      "@/features/products/image-storage"
    );

    await uploadProcessedProductImageVariant({
      body: Buffer.from("image"),
      organizationId: "org_dg_imports",
      productId: "product-1",
      variant: "detail",
      version: 2,
    });

    expect(storageMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: "final",
          Key: "organizations/org_dg_imports/products/product-1/v2/detail.webp",
        }),
      })
    );
  });

  it("returns a streamable body for stored image reads", async () => {
    const stream = new ReadableStream();
    const { readPublicProductImageVariant } = await import(
      "@/features/products/image-storage"
    );
    storageMocks.send.mockResolvedValueOnce({
      Body: {
        transformToWebStream: () => stream,
      },
      CacheControl: "public, max-age=31536000, immutable",
      ContentType: "image/webp",
      ETag: '"etag"',
    });

    const image = await readPublicProductImageVariant({
      organizationId: "org_dg_imports",
      productId: "product-1",
      variant: "detail",
      version: 1,
    });

    expect(image.body).toBe(stream);
  });

  it("marks staging CORS healthy only when the app origin can upload and read ETags", async () => {
    const { getR2StagingHealthDiagnostics } = await import(
      "@/features/products/image-storage"
    );
    storageMocks.send.mockResolvedValueOnce({}).mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedHeaders: ["Content-Type"],
          AllowedMethods: ["PUT", "HEAD"],
          AllowedOrigins: ["https://app.example.com"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 300,
        },
      ],
    });

    const diagnostics = await getR2StagingHealthDiagnostics();

    expect(diagnostics.ok).toBe(true);
    expect(diagnostics.summary).toBe(
      "R2 staging acessivel e CORS permite uploads da origem configurada."
    );
  });

  it("marks staging CORS unhealthy when the app origin is missing", async () => {
    const { getR2StagingHealthDiagnostics } = await import(
      "@/features/products/image-storage"
    );
    storageMocks.send.mockResolvedValueOnce({}).mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedHeaders: ["Content-Type"],
          AllowedMethods: ["PUT", "HEAD"],
          AllowedOrigins: ["https://other.example.com"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 300,
        },
      ],
    });

    const diagnostics = await getR2StagingHealthDiagnostics();

    expect(diagnostics.ok).toBe(false);
    expect(diagnostics.summary).toBe(
      "CORS do bucket de staging nao permite upload completo da origem configurada."
    );
  });
});
