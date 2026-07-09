import { getR2StagingHealthDiagnostics } from "@/features/products/image-storage";
import { serverEnv } from "@/lib/env";
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

  const authorization = request.headers.get("authorization");
  const expectedAuthorization = serverEnv.CRON_SECRET
    ? `Bearer ${serverEnv.CRON_SECRET}`
    : null;

  if (!expectedAuthorization || authorization !== expectedAuthorization) {
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
