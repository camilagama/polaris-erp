import { readPublicProductImageVariant } from "@/features/products/image-storage";
import { auth } from "@/lib/auth";

const VALID_VARIANTS = new Set(["detail", "table"]);

export async function GET(
  request: Request,
  props: {
    params: Promise<{
      productId: string;
      variant: string;
      version: string;
    }>;
  }
) {
  const { productId, variant, version } = await props.params;
  const parsedVersion = Number(version);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(VALID_VARIANTS.has(variant) && Number.isInteger(parsedVersion))) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const image = await readPublicProductImageVariant({
      productId,
      variant: variant as "detail" | "table",
      version: parsedVersion,
    });
    const requestEtag = request.headers.get("if-none-match");
    const responseHeaders = {
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Type": image.contentType,
      ETag: image.etag ?? "",
      Vary: "Cookie",
    };

    if (image.etag && requestEtag === image.etag) {
      return new Response(null, {
        headers: responseHeaders,
        status: 304,
      });
    }

    return new Response(image.body, {
      headers: responseHeaders,
      status: 200,
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
