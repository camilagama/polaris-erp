"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getProductCategoryById } from "@/features/catalog/server";
import {
  clearProductImageMetadata,
  getProductImageState,
  replaceProductImageMetadata,
} from "@/features/products/image-access";
import {
  type StagedProductImageInput,
  stagedProductImageSchema,
} from "@/features/products/image-schema";
import { deleteProductImageVersion } from "@/features/products/image-storage";
import { storeProductImageFromStage } from "@/features/products/image-workflow";
import {
  createProductSchema,
  stockAdditionSchema,
  stockWriteOffSchema,
  updateProductSchema,
} from "@/features/products/schema";
import {
  addProductStock,
  createProductWithInitialStock,
  setProductArchivedState,
  updateProductWithPriceHistory,
  writeOffProductStock,
} from "@/features/products/server";
import { requireAppContext } from "@/lib/app-session";
import { recordAuditEvent } from "@/lib/audit-log";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";
import { toCurrencyString } from "@/lib/domain/currency";

const revalidateCatalogViews = (organizationId: string) => {
  revalidatePath("/produtos");
  updateTag(buildOrganizationCacheTags(organizationId).catalog);
};

const revalidateSharedAnalytics = (organizationId: string) => {
  revalidatePath("/produtos");
  updateTag(buildOrganizationCacheTags(organizationId).analytics);
};

const revalidateCatalogAndAnalytics = (organizationId: string) => {
  const tags = buildOrganizationCacheTags(organizationId);
  revalidatePath("/produtos");
  updateTag(tags.catalog);
  updateTag(tags.analytics);
};

const revalidateProductDetail = (productId: string) => {
  revalidatePath(`/produtos/${productId}`);
};

const firstZodErrorMessage = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Dados invalidos.";

export async function createProductAction(input: unknown): Promise<string> {
  const context = await requireAppContext("products:write");
  const result = createProductSchema.safeParse(input);
  const stagedImage =
    typeof input === "object" && input !== null && "stagedImage" in input
      ? stagedProductImageSchema.safeParse(input.stagedImage)
      : null;

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  const category = await getProductCategoryById(
    context.organizationId,
    result.data.categoryId
  );

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  const productId = crypto.randomUUID();
  let storedImage: Awaited<
    ReturnType<typeof storeProductImageFromStage>
  > | null = null;

  try {
    if (stagedImage?.success) {
      storedImage = await storeProductImageFromStage({
        organizationId: context.organizationId,
        productId,
        stagedImage: stagedImage.data,
        userId: context.userId,
        version: 1,
      });
    }

    await createProductWithInitialStock({
      actorUserId: context.userId,
      categoryId: result.data.categoryId,
      costPrice: toCurrencyString(result.data.costPrice),
      description: result.data.description || null,
      image: storedImage
        ? {
            blurDataURL: storedImage.blurDataURL,
            height: storedImage.height,
            version: storedImage.version,
            width: storedImage.width,
          }
        : null,
      name: result.data.name,
      organizationId: context.organizationId,
      price: toCurrencyString(result.data.price),
      productId,
      purchasedOn: result.data.purchasedOn,
      stock: result.data.stock,
    });
  } catch (error) {
    if (storedImage) {
      await deleteProductImageVersion({
        organizationId: context.organizationId,
        productId,
        version: storedImage.version,
      });
    }

    throw error;
  }

  revalidateCatalogAndAnalytics(context.organizationId);
  revalidateProductDetail(productId);
  return productId;
}

export async function updateProductAction(id: string, input: unknown) {
  const context = await requireAppContext("products:write");
  const result = updateProductSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  const category = await getProductCategoryById(
    context.organizationId,
    result.data.categoryId
  );

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  await updateProductWithPriceHistory({
    actorUserId: context.userId,
    categoryId: result.data.categoryId,
    description: result.data.description || null,
    name: result.data.name,
    organizationId: context.organizationId,
    price: toCurrencyString(result.data.price),
    productId: id,
  });

  revalidateCatalogViews(context.organizationId);
  revalidateProductDetail(id);
}
export async function replaceProductImageAction(
  id: string,
  image: StagedProductImageInput
) {
  const context = await requireAppContext("products:write");
  const parsed = stagedProductImageSchema.safeParse(image);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      success: false,
    } as const;
  }

  const product = await getProductImageState(context.organizationId, id);

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  const oldVersion = product.imageVersion;
  const storedImage = await storeProductImageFromStage({
    organizationId: context.organizationId,
    productId: id,
    stagedImage: parsed.data,
    userId: context.userId,
    version: (oldVersion ?? 0) + 1,
  });

  if (!storedImage) {
    return { success: true } as const;
  }

  const imageMetadataReplaced = await replaceProductImageMetadata({
    blurDataURL: storedImage.blurDataURL,
    height: storedImage.height,
    newVersion: storedImage.version,
    oldVersion,
    organizationId: context.organizationId,
    productId: id,
    width: storedImage.width,
  });

  if (!imageMetadataReplaced) {
    await deleteProductImageVersion({
      organizationId: context.organizationId,
      productId: id,
      version: storedImage.version,
    });
    throw new Error(
      "Imagem do produto foi atualizada por outra operacao. Recarregue e tente novamente."
    );
  }

  if (oldVersion !== null) {
    await deleteProductImageVersion({
      organizationId: context.organizationId,
      productId: id,
      version: oldVersion,
    });
  }

  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product_image",
    type: "product_image.replaced",
  });
  revalidateCatalogViews(context.organizationId);
  revalidateProductDetail(id);
  return { success: true } as const;
}

export async function removeProductImageAction(id: string) {
  const context = await requireAppContext("products:write");
  const product = await getProductImageState(context.organizationId, id);

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  if (!product.imageVersion) {
    return { success: true } as const;
  }

  const imageMetadataCleared = await clearProductImageMetadata({
    currentVersion: product.imageVersion,
    organizationId: context.organizationId,
    productId: id,
  });

  if (!imageMetadataCleared) {
    throw new Error(
      "Imagem do produto foi atualizada por outra operacao. Recarregue e tente novamente."
    );
  }

  await deleteProductImageVersion({
    organizationId: context.organizationId,
    productId: id,
    version: product.imageVersion,
  });

  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product_image",
    type: "product_image.removed",
  });
  revalidateCatalogViews(context.organizationId);
  revalidateProductDetail(id);
  return { success: true } as const;
}

export async function addProductStockAction(productId: string, input: unknown) {
  const context = await requireAppContext("products:write");
  const result = stockAdditionSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  await addProductStock({
    actorUserId: context.userId,
    organizationId: context.organizationId,
    productId,
    quantity: result.data.quantity,
    stockedOn: result.data.stockedOn,
    unitCost: result.data.unitCost,
  });

  revalidateSharedAnalytics(context.organizationId);
  revalidateProductDetail(productId);
}

export async function writeOffProductStockAction(
  productId: string,
  input: unknown
) {
  const context = await requireAppContext("products:write");
  const result = stockWriteOffSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  await writeOffProductStock({
    actorUserId: context.userId,
    happenedOn: result.data.happenedOn,
    notes: result.data.notes || null,
    organizationId: context.organizationId,
    productId,
    quantity: result.data.quantity,
    reason: result.data.reason,
  });

  revalidateSharedAnalytics(context.organizationId);
  revalidateProductDetail(productId);
}

export async function archiveProductAction(id: string) {
  const context = await requireAppContext("products:write");

  const archived = await setProductArchivedState({
    actorUserId: context.userId,
    archived: true,
    organizationId: context.organizationId,
    productId: id,
  });

  if (!archived) {
    throw new Error("Produto nao encontrado.");
  }

  revalidateCatalogViews(context.organizationId);
  revalidateProductDetail(id);
}

export async function unarchiveProductAction(id: string) {
  const context = await requireAppContext("products:write");

  const unarchived = await setProductArchivedState({
    actorUserId: context.userId,
    archived: false,
    organizationId: context.organizationId,
    productId: id,
  });

  if (!unarchived) {
    throw new Error("Produto nao encontrado.");
  }

  revalidateCatalogViews(context.organizationId);
  revalidateProductDetail(id);
}
