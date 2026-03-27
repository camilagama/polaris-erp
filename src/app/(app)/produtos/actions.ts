"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { createProduct, updateProductStatus } from "@/lib/domain/operations";
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

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/produtos", params));

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
    await createProduct(parsed.data, session.user.id);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o produto.",
    });
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return redirectWithResult({
    message: "Produto criado com sucesso.",
  });
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
  return redirectWithResult({
    message: "Status do produto atualizado.",
  });
}
