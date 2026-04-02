import { readPublicProductImageVariant } from "@/features/products/image-storage";

export const runtime = "nodejs";

const VALID_VARIANTS = new Set(["detail", "table"]);

export async function GET(
  _request: Request,
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

  if (!(VALID_VARIANTS.has(variant) && Number.isInteger(parsedVersion))) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const image = await readPublicProductImageVariant({
      productId,
      variant: variant as "detail" | "table",
      version: parsedVersion,
    });

    return new Response(image.body, {
      headers: {
        "Cache-Control": image.cacheControl,
        "Content-Type": image.contentType,
        ETag: image.etag ?? "",
      },
      status: 200,
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
