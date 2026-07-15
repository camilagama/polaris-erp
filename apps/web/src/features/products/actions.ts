"use server";

import {
  appendProductImageMetadata,
  clearProductImageMetadata,
  createProductImageVersion,
  getProductImageState,
  removeAdditionalProductImageMetadata,
  replaceProductImageMetadata,
} from "@/features/products/image-access";
import {
  type StagedProductImageInput,
  stagedProductImageSchema,
} from "@/features/products/image-schema";
import { storeProductImageFromStage } from "@/features/products/image-workflow";
import {
  createProductSchema,
  productImageVersionSchema,
  softDeleteProductSchema,
  stockAdditionSchema,
  stockWriteOffSchema,
  updateProductSchema,
} from "@/features/products/schema";
import {
  addProductStock,
  createProductWithInitialStock,
  setProductArchivedState,
  softDeleteProduct,
  updateProductWithPriceHistory,
  writeOffProductStock,
} from "@/features/products/server";
import { requireAppContext } from "@/lib/app-session";
import { toCurrencyString } from "@/lib/domain/currency";
import {
  productCreated,
  productDetailsChanged,
  productInventoryChanged,
} from "@/lib/domain-invalidation";

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

  const productId = crypto.randomUUID();
  let storedImage: Awaited<
    ReturnType<typeof storeProductImageFromStage>
  > | null = null;

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

  productCreated({
    organizationId: context.organizationId,
    productId,
  });
  return productId;
}

export async function updateProductAction(id: string, input: unknown) {
  const context = await requireAppContext("products:write");
  const result = updateProductSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
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

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
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
    actorUserId: context.userId,
    blurDataURL: storedImage.blurDataURL,
    height: storedImage.height,
    newVersion: storedImage.version,
    oldVersion,
    organizationId: context.organizationId,
    productId: id,
    width: storedImage.width,
  });

  if (!imageMetadataReplaced) {
    throw new Error(
      "Imagem do produto foi atualizada por outra operacao. Recarregue e tente novamente."
    );
  }

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
  return { success: true } as const;
}

export async function addProductImageAction(
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

  const version = createProductImageVersion();
  const storedImage = await storeProductImageFromStage({
    organizationId: context.organizationId,
    productId: id,
    stagedImage: parsed.data,
    userId: context.userId,
    version,
  });

  await appendProductImageMetadata({
    actorUserId: context.userId,
    blurDataUrl: storedImage.blurDataURL,
    height: storedImage.height,
    organizationId: context.organizationId,
    productId: id,
    version: storedImage.version,
    width: storedImage.width,
  });

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
  return { success: true } as const;
}

export async function removeAdditionalProductImageAction(
  id: string,
  version: unknown
) {
  const context = await requireAppContext("products:write");
  const parsedVersion = productImageVersionSchema.safeParse(version);

  if (!parsedVersion.success) {
    throw new Error(firstZodErrorMessage(parsedVersion.error));
  }

  const removed = await removeAdditionalProductImageMetadata({
    actorUserId: context.userId,
    organizationId: context.organizationId,
    productId: id,
    version: parsedVersion.data,
  });

  if (!removed) {
    throw new Error("Imagem adicional nao encontrada.");
  }

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
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
    actorUserId: context.userId,
    currentVersion: product.imageVersion,
    organizationId: context.organizationId,
    productId: id,
  });

  if (!imageMetadataCleared) {
    throw new Error(
      "Imagem do produto foi atualizada por outra operacao. Recarregue e tente novamente."
    );
  }

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
  return { success: true } as const;
}

export async function addProductStockAction(
  productId: string,
  input: unknown,
  idempotencyKey = crypto.randomUUID()
) {
  const context = await requireAppContext("inventory:write");
  const result = stockAdditionSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  await addProductStock({
    actorUserId: context.userId,
    idempotencyKey,
    organizationId: context.organizationId,
    productId,
    quantity: result.data.quantity,
    stockedOn: result.data.stockedOn,
    unitCost: result.data.unitCost,
  });

  productInventoryChanged({
    organizationId: context.organizationId,
    productId,
  });
}

export async function writeOffProductStockAction(
  productId: string,
  input: unknown,
  idempotencyKey = crypto.randomUUID()
) {
  const context = await requireAppContext("inventory:write");
  const result = stockWriteOffSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  await writeOffProductStock({
    actorUserId: context.userId,
    happenedOn: result.data.happenedOn,
    idempotencyKey,
    notes: result.data.notes || null,
    organizationId: context.organizationId,
    productId,
    quantity: result.data.quantity,
    reason: result.data.reason,
  });

  productInventoryChanged({
    organizationId: context.organizationId,
    productId,
  });
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

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
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

  productDetailsChanged({
    organizationId: context.organizationId,
    productId: id,
  });
}

export async function softDeleteProductAction(id: string, input: unknown) {
  const context = await requireAppContext("products:write");
  const result = softDeleteProductSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  const deletionResult = await softDeleteProduct({
    actorUserId: context.userId,
    organizationId: context.organizationId,
    productId: id,
    reason: result.data.reason,
  });

  if (deletionResult === "deleted") {
    productDetailsChanged({
      organizationId: context.organizationId,
      productId: id,
    });
  }

  return deletionResult;
}
