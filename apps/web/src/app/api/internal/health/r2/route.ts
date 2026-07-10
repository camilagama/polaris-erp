import { getR2StagingHealthDiagnostics } from "@/features/products/image-storage";
import { serverEnv } from "@/lib/env";
import { isAuthorizedBearerRequest } from "@/lib/internal-bearer-auth";
import { checkRateLimit, getRateLimitKeyFromRequest } from "@/lib/rate-limit";
import { jsonError } from "@/lib/server-api-error";

async function handleHealth(request: Request): Promise<Response> {
  const rateLimit = await checkRateLimit({
    key: getRateLimitKeyFromRequest(request, "internal-r2-health"),
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
    !isAuthorizedBearerRequest(request, serverEnv.INTERNAL_R2_HEALTH_SECRET)
  ) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const diagnostics = await getR2StagingHealthDiagnostics();
    return Response.json(diagnostics);
  } catch (error) {
    return jsonError("Nao foi possivel obter o diagnostico do R2.", 500, error);
  }
}

export function GET(request: Request): Promise<Response> {
  return handleHealth(request);
}

export function POST(request: Request): Promise<Response> {
  return handleHealth(request);
}
