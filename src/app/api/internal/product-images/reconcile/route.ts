import { db } from "@/db";
import { products } from "@/db/schema";
import {
  deleteManyProductImageKeys,
  getExpectedProductImageKeys,
  listAllStoredProductImageKeys,
} from "@/features/products/image-storage";
import { serverEnv } from "@/lib/env";
import { checkRateLimit, getRateLimitKeyFromRequest } from "@/lib/rate-limit";
import { jsonError } from "@/lib/server-api-error";

async function reconcile(request: Request): Promise<Response> {
  const rateLimit = await checkRateLimit({
    key: getRateLimitKeyFromRequest(request, "internal-image-reconcile"),
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  const authorization = request.headers.get("authorization");
  const expectedAuthorization = serverEnv.CRON_SECRET
    ? `Bearer ${serverEnv.CRON_SECRET}`
    : null;

  if (!expectedAuthorization || authorization !== expectedAuthorization) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const [storedKeys, productRows] = await Promise.all([
      listAllStoredProductImageKeys(),
      db
        .select({
          id: products.id,
          imageVersion: products.imageVersion,
          organizationId: products.organizationId,
        })
        .from(products),
    ]);

    const expectedKeys = new Set(
      productRows.flatMap((product) =>
        product.imageVersion === null
          ? []
          : getExpectedProductImageKeys(
              product.organizationId,
              product.id,
              product.imageVersion
            )
      )
    );

    const orphanedKeys = storedKeys.filter((key) => !expectedKeys.has(key));

    await deleteManyProductImageKeys(orphanedKeys);

    return Response.json({
      deletedCount: orphanedKeys.length,
      orphanedCount: orphanedKeys.length,
      scannedCount: storedKeys.length,
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
