import { listReferencedProductImageKeys } from "@/features/products/image-access";
import {
  deleteManyProductImageKeys,
  listAllStoredProductImageObjects,
} from "@/features/products/image-storage";
import { serverEnv } from "@/lib/env";
import { isAuthorizedBearerRequest } from "@/lib/internal-bearer-auth";
import { checkRateLimit, getRateLimitKeyFromRequest } from "@/lib/rate-limit";
import { jsonError } from "@/lib/server-api-error";

const PRODUCT_IMAGE_RECONCILE_MIN_AGE_MS = 15 * 60 * 1000;

const isOldEnoughForReconcileDelete = (
  lastModified: Date | null,
  now: Date
): boolean =>
  lastModified !== null &&
  now.getTime() - lastModified.getTime() >= PRODUCT_IMAGE_RECONCILE_MIN_AGE_MS;

async function reconcile(request: Request): Promise<Response> {
  const rateLimit = await checkRateLimit({
    key: getRateLimitKeyFromRequest(request, "internal-image-reconcile"),
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
      {
        headers: {
          "Retry-After": rateLimit.retryAfterSeconds.toString(),
        },
        status: 429,
      }
    );
  }

  const internalSecret =
    serverEnv.PRODUCT_IMAGE_RECONCILE_SECRET ?? serverEnv.CRON_SECRET;

  if (!isAuthorizedBearerRequest(request, internalSecret)) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
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

    return Response.json({
      deletedCount: orphanedKeys.length,
      orphanedCount: orphanedObjects.length,
      scannedCount: storedObjects.length,
      skippedRecentCount: orphanedObjects.length - orphanedKeys.length,
    });
  } catch (error) {
    return jsonError(
      "Nao foi possivel reconciliar as imagens de produto.",
      500,
      error
    );
  }
}

/** Vercel Cron invoca o path com GET por padrao. */
export function GET(request: Request): Promise<Response> {
  return reconcile(request);
}

export function POST(request: Request): Promise<Response> {
  return reconcile(request);
}
