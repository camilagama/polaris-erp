import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, systemSettings } from "@/db/schema";
import {
  catalogSettingsSchema,
  categorySchema,
} from "@/features/catalog/schema";
import {
  GLOBAL_SETTINGS_ID,
  OTHERS_CATEGORY_KEY,
  OTHERS_CATEGORY_NAME,
} from "./constants";
import { canDeleteCategory, canRenameCategory } from "./guards";
import { normalizeCardInstallmentRules } from "./payment-rules";

const ensureOthersCategory = async () => {
  const existing = await db.query.categories.findFirst({
    where: eq(categories.key, OTHERS_CATEGORY_KEY),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(categories)
    .values({
      description: "Categoria padrao protegida pelo sistema.",
      isSystem: true,
      key: OTHERS_CATEGORY_KEY,
      name: OTHERS_CATEGORY_NAME,
    })
    .returning();

  return created;
};

export interface CatalogCategory {
  description: string | null;
  id: string;
  isSystem: boolean;
  key: string;
  name: string;
  productCount: number;
}

export interface CatalogSettings {
  cardInstallmentRules: Array<{
    feePercent: number;
    installments: number;
  }>;
  idealMarkupPercent: number;
  minimumMarkupPercent: number;
}

export const getCatalogSettings = async (): Promise<CatalogSettings> => {
  const existing = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.id, GLOBAL_SETTINGS_ID),
  });

  if (existing) {
    return {
      cardInstallmentRules: normalizeCardInstallmentRules(
        existing.paymentFeeRules
      ),
      idealMarkupPercent: Number(existing.idealMarkupPercent),
      minimumMarkupPercent: Number(existing.minimumMarkupPercent),
    };
  }

  const [created] = await db
    .insert(systemSettings)
    .values({
      id: GLOBAL_SETTINGS_ID,
    })
    .returning();

  return {
    cardInstallmentRules: normalizeCardInstallmentRules(
      created.paymentFeeRules
    ),
    idealMarkupPercent: Number(created.idealMarkupPercent),
    minimumMarkupPercent: Number(created.minimumMarkupPercent),
  };
};

export const listCategoriesWithUsage = async (): Promise<CatalogCategory[]> => {
  await ensureOthersCategory();

  const rows = await db
    .select({
      description: categories.description,
      id: categories.id,
      isSystem: categories.isSystem,
      key: categories.key,
      name: categories.name,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(desc(categories.isSystem), asc(categories.name));

  return rows.map((row) => ({
    ...row,
    productCount: Number(row.productCount),
  }));
};

export const createCategory = (input: unknown) => {
  const parsed = categorySchema.parse(input);

  return db.insert(categories).values({
    ...parsed,
    key: crypto.randomUUID(),
  });
};

export const updateCategory = async (id: string, input: unknown) => {
  const parsed = categorySchema.parse(input);
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });

  if (!category) {
    throw new Error("Categoria nao encontrada.");
  }

  if (!canRenameCategory(category)) {
    throw new Error("A categoria Outros e protegida pelo sistema.");
  }

  await db.update(categories).set(parsed).where(eq(categories.id, id));
};

export const deleteCategory = async (id: string) => {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });

  if (!category) {
    throw new Error("Categoria nao encontrada.");
  }

  const [{ total }] = await db
    .select({
      total: count(products.id),
    })
    .from(products)
    .where(eq(products.categoryId, id));

  if (!canDeleteCategory(category, Number(total))) {
    if (!canRenameCategory(category)) {
      throw new Error("A categoria Outros e protegida pelo sistema.");
    }

    throw new Error(
      "Nao e possivel remover uma categoria que ainda possui produtos vinculados."
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
};

export const saveCatalogSettings = async (input: unknown) => {
  const parsed = catalogSettingsSchema.parse(input);
  const cardInstallmentRules = normalizeCardInstallmentRules(
    parsed.cardInstallmentRules
  );

  await db
    .insert(systemSettings)
    .values({
      id: GLOBAL_SETTINGS_ID,
      idealMarkupPercent: parsed.idealMarkupPercent.toFixed(2),
      minimumMarkupPercent: parsed.minimumMarkupPercent.toFixed(2),
      paymentFeeRules: cardInstallmentRules,
    })
    .onConflictDoUpdate({
      set: {
        idealMarkupPercent: parsed.idealMarkupPercent.toFixed(2),
        minimumMarkupPercent: parsed.minimumMarkupPercent.toFixed(2),
        paymentFeeRules: cardInstallmentRules,
        updatedAt: new Date(),
      },
      target: systemSettings.id,
    });
};

export const getProductCategoryById = async (id: string) =>
  db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
