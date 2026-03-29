"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { buildRedirectPath } from "@/lib/action-feedback";
import { requireSession } from "@/lib/session";

const createProductSchema = z.object({
  category: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(2000).optional(),
  salePrice: z.coerce.number().positive(),
  unitCost: z.coerce.number().positive(),
});

const pricingSchema = z.object({
  productId: z.coerce.number().int().positive(),
  salePrice: z.coerce.number().positive(),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/produtos", params));

export async function createProductAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createProductSchema.safeParse({
    category: formData.get("category") ?? "",
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
    const category =
      parsed.data.category && parsed.data.category.trim() !== ""
        ? parsed.data.category.trim()
        : null;

    await db.insert(products).values({
      averageCost: String(parsed.data.unitCost),
      category,
      createdByUserId: session.user.id,
      currentStock: 0,
      name: parsed.data.name,
      notes: parsed.data.notes,
      salePrice: String(parsed.data.salePrice),
    });

    revalidatePath("/produtos");
    return redirectWithResult({ message: "Produto criado com sucesso." });
  } catch {
    return redirectWithResult({
      error: "Nao foi possivel criar o produto.",
    });
  }
}

export async function updateProductCommercialDataAction(formData: FormData) {
  await requireSession();
  const parsed = pricingSchema.safeParse({
    productId: formData.get("productId"),
    salePrice: formData.get("salePrice"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Nao foi possivel atualizar os dados do produto.",
    });
  }

  await db
    .update(products)
    .set({
      salePrice: String(parsed.data.salePrice),
      updatedAt: new Date(),
    })
    .where(eq(products.id, parsed.data.productId));

  revalidatePath("/produtos");
  return redirectWithResult({ message: "Preco atualizado." });
}
