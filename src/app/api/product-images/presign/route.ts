import { productImageUploadRequestSchema } from "@/features/products/image-schema";
import {
  createPresignedProductImageUpload,
  createStagingObjectKey,
} from "@/features/products/image-storage";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

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
    });

    return Response.json({
      objectKey,
      ...presigned,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel preparar o upload da imagem.",
      },
      { status: 500 }
    );
  }
}
