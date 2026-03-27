"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import {
  createInventoryAdjustment,
  createProduct,
  updateProductCommercialData,
  updateProductStatus,
} from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const createProductSchema = z.object({
  category: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  initialStock: z.coerce.number().int().min(0),
  name: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(2000).optional(),
  salePrice: z.coerce.number().positive(),
  unitCost: z.coerce.number().positive(),
});

const statusSchema = z.object({
  productId: z.coerce.number().int().positive(),
  status: z.enum(["active", "inactive"]),
});

const pricingSchema = z.object({
  averageCost: z.coerce.number().positive().optional(),
  productId: z.coerce.number().int().positive(),
  salePrice: z.coerce.number().positive().optional(),
});

const movementSchema = z.object({
  note: z.string().trim().max(2000).optional(),
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  type: z.enum([
    "purchase_in",
    "adjustment_plus",
    "adjustment_minus",
    "customer_return",
    "damage",
    "loss",
  ]),
  unitCost: z.coerce.number().min(0).optional(),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/produtos", params));

const redirectWithProductResult = (
  productId: number,
  params: Record<string, string | undefined>
) =>
  redirectWithResult({
    productId: String(productId),
    ...params,
  });

export async function createProductAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createProductSchema.safeParse({
    category: formData.get("category") ?? "",
    description: formData.get("description") ?? "",
    initialStock: formData.get("initialStock") ?? 0,
    name: formData.get("name") ?? "",
    notes: formData.get("notes") ?? "",
    salePrice: formData.get("salePrice") ?? 0,
    unitCost: formData.get("unitCost") ?? 0,
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os campos do produto antes de salvar.",
    });
  }

  try {
    const product = await createProduct(parsed.data, session.user.id);

    revalidatePath("/");
    revalidatePath("/produtos");
    revalidatePath("/vendas");
    return redirectWithProductResult(product.id, {
      message: "Produto criado com sucesso.",
    });
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o produto.",
    });
  }
}

export async function updateProductStatusAction(formData: FormData) {
  const parsed = statusSchema.safeParse({
    productId: formData.get("productId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Nao foi possivel atualizar o status do produto.",
    });
  }

  await updateProductStatus(parsed.data.productId, parsed.data.status);

  revalidatePath("/");
  revalidatePath("/produtos");
  return redirectWithProductResult(parsed.data.productId, {
    message: "Status do produto atualizado.",
  });
}

export async function updateProductCommercialDataAction(formData: FormData) {
  const parsed = pricingSchema.safeParse({
    averageCost: formData.get("averageCost") ?? undefined,
    productId: formData.get("productId"),
    salePrice: formData.get("salePrice") ?? undefined,
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Nao foi possivel atualizar os dados do produto.",
    });
  }

  const hasAverageCost = typeof parsed.data.averageCost === "number";
  const hasSalePrice = typeof parsed.data.salePrice === "number";

  if (!(hasAverageCost || hasSalePrice)) {
    return redirectWithProductResult(parsed.data.productId, {
      error: "Informe um novo custo ou um novo preco.",
    });
  }

  try {
    await updateProductCommercialData(parsed.data);
  } catch (error) {
    return redirectWithProductResult(parsed.data.productId, {
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar os dados do produto.",
    });
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/vendas");
  return redirectWithProductResult(parsed.data.productId, {
    message: "Dados do produto atualizados.",
  });
}

export async function createProductMovementAction(formData: FormData) {
  const session = await requireSession();
  const parsed = movementSchema.safeParse({
    note: formData.get("note") ?? "",
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
    unitCost: formData.get("unitCost") ?? undefined,
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os dados da operacao antes de salvar.",
    });
  }

  try {
    await createInventoryAdjustment(parsed.data, session.user.id);
  } catch (error) {
    return redirectWithProductResult(parsed.data.productId, {
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a operacao do produto.",
    });
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/vendas");
  return redirectWithProductResult(parsed.data.productId, {
    message: "Operacao do produto registrada.",
  });
}
