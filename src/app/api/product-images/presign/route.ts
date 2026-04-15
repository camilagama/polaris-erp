import { productImageUploadRequestSchema } from "@/features/products/image-schema";
import {
  createPresignedProductImageUpload,
  createStagingObjectKey,
} from "@/features/products/image-storage";
import { auth } from "@/lib/auth";
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
