import { productImageUploadRequestSchema } from "@/features/products/image-schema";
import {
  createPresignedProductImageUpload,
  createStagingObjectKey,
} from "@/features/products/image-storage";
import { getAppContext } from "@/lib/app-session";
import { recordAuditEvent } from "@/lib/audit-log";
import { auth } from "@/lib/auth";
import { checkRateLimit, getRateLimitKeyFromRequest } from "@/lib/rate-limit";
import { jsonError } from "@/lib/server-api-error";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return Response.json(
      { error: "Sessao invalida. Faca login novamente." },
      {
        status: 401,
      }
    );
  }

  const ipRateLimit = checkRateLimit({
    key: getRateLimitKeyFromRequest(request, "product-image-presign"),
    limit: 60,
    windowMs: 60 * 1000,
  });

  const userRateLimit = checkRateLimit({
    key: `product-image-presign:user:${session.user.id}`,
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (!(ipRateLimit.ok && userRateLimit.ok)) {
    return Response.json(
      { error: "Muitas tentativas de upload. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = productImageUploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Imagem invalida." },
      { status: 400 }
    );
  }

  try {
    const objectKey = createStagingObjectKey(session.user.id);
    const presigned = await createPresignedProductImageUpload({
      contentType: parsed.data.contentType,
      objectKey,
      size: parsed.data.size,
    });
    const context = await getAppContext();

    if (context) {
      await recordAuditEvent({
        context,
        metadata: {
          contentType: parsed.data.contentType,
          size: parsed.data.size,
        },
        subjectId: objectKey,
        subjectType: "product_image",
        type: "product_image.presign_created",
      });
    }

    return Response.json({
      objectKey,
      ...presigned,
    });
  } catch (error) {
    return jsonError(
      "Nao foi possivel preparar o upload da imagem.",
      500,
      error
    );
  }
}
