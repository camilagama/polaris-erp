import { reconcileProductImages } from "@/features/products/image-reconcile";
import { serverEnv } from "@/lib/env";
import { isAuthorizedBearerRequest } from "@/lib/internal-bearer-auth";
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
      {
        headers: {
          "Retry-After": rateLimit.retryAfterSeconds.toString(),
        },
        status: 429,
      }
    );
  }

  if (
    !isAuthorizedBearerRequest(
      request,
      serverEnv.PRODUCT_IMAGE_RECONCILE_SECRET
    )
  ) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    return Response.json(await reconcileProductImages());
  } catch (error) {
    return jsonError(
      "Nao foi possivel reconciliar as imagens de produto.",
      500,
      error
    );
  }
}

export function GET(request: Request): Promise<Response> {
  return reconcile(request);
}

export function POST(request: Request): Promise<Response> {
  return reconcile(request);
}
