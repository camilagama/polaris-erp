import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, products } from "@/db/schema";
import { readPublicProductImageVariant } from "@/features/products/image-storage";
import { recordActorAuditEvent } from "@/lib/audit-log";
import { auth } from "@/lib/auth";

const VALID_VARIANTS = new Set(["detail", "table"]);

export async function GET(
  request: Request,
  props: {
    params: Promise<{
      organizationId: string;
      productId: string;
      variant: string;
      version: string;
    }>;
  }
) {
  const { organizationId, productId, variant, version } = await props.params;
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

  const [product, membership] = await Promise.all([
    db.query.products.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        eq(products.imageVersion, parsedVersion)
      ),
    }),
    db.query.member.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id)
      ),
    }),
  ]);

  if (!(product && membership)) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const image = await readPublicProductImageVariant({
      organizationId,
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
      await recordActorAuditEvent({
        actorUserId: session.user.id,
        metadata: { cached: true, variant, version: parsedVersion },
        organizationId,
        subjectId: productId,
        subjectType: "product_image",
        type: "product_image.viewed",
      });

      return new Response(null, {
        headers: responseHeaders,
        status: 304,
      });
    }

    await recordActorAuditEvent({
      actorUserId: session.user.id,
      metadata: { cached: false, variant, version: parsedVersion },
      organizationId,
      subjectId: productId,
      subjectType: "product_image",
      type: "product_image.viewed",
    });

    return new Response(image.body, {
      headers: responseHeaders,
      status: 200,
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
