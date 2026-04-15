import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_STAGING;

if (!(accountId && accessKeyId && secretAccessKey && bucket)) {
  throw new Error(
    "Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_STAGING antes de configurar o CORS."
  );
}

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://dgimports-1yer-1cyy8sh3u-summit-studios-projects.vercel.app",
  "https://tiagogama.vercel.app",
];

const extraOriginsRaw = process.env.R2_STAGING_CORS_EXTRA_ORIGINS ?? "";
const extraOrigins = extraOriginsRaw
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const allowedOrigins = [...new Set([...defaultOrigins, ...extraOrigins])];

const client = new S3Client({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  region: "auto",
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["Content-Type"],
          AllowedMethods: ["PUT", "HEAD"],
          AllowedOrigins: allowedOrigins,
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 300,
        },
      ],
    },
  })
);

console.log(
  JSON.stringify(
    {
      allowedOrigins,
      bucket,
      status: "ok",
    },
    null,
    2
  )
);
