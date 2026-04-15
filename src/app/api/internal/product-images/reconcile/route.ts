import { db } from "@/db";
import { products } from "@/db/schema";
import {
  deleteManyProductImageKeys,
  getExpectedProductImageKeys,
  listAllStoredProductImageKeys,
} from "@/features/products/image-storage";
import { serverEnv } from "@/lib/env";
import { jsonError } from "@/lib/server-api-error";

async function reconcile(request: Request): Promise<Response> {
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
        })
        .from(products),
    ]);

    const expectedKeys = new Set(
      productRows.flatMap((product) =>
        product.imageVersion === null
          ? []
          : getExpectedProductImageKeys(product.id, product.imageVersion)
      )
    );

    const orphanedKeys = storedKeys.filter((key) => !expectedKeys.has(key));

    await deleteManyProductImageKeys(orphanedKeys);

    return Response.json({
      deletedCount: orphanedKeys.length,
      orphanedKeys,
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
