import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { categories, products, systemSettings } from "@/db/schema";
import { withTenantContext } from "@/db/tenant-context";
import {
  catalogSettingsSchema,
  categorySchema,
} from "@/features/catalog/schema";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";
import { GLOBAL_SETTINGS_ID } from "./constants";
import { canDeleteCategory, canRenameCategory } from "./guards";
import { normalizeCardInstallmentRules } from "./payment-rules";

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

export const getCatalogSettings = async (
  organizationId: string
): Promise<CatalogSettings> => {
  "use cache: remote";
  cacheTag(buildOrganizationCacheTags(organizationId).catalog);
  cacheLife("hours");

  const existing = await withTenantContext(organizationId, (tx) =>
    tx.query.systemSettings.findFirst({
      where: and(
        eq(systemSettings.id, GLOBAL_SETTINGS_ID),
        eq(systemSettings.organizationId, organizationId)
      ),
    })
  );

  if (!existing) {
    throw new Error(
      "Configuracoes globais nao encontradas. Execute as migracoes antes de iniciar a operacao."
    );
  }

  return {
    cardInstallmentRules: normalizeCardInstallmentRules(
      existing.paymentFeeRules
    ),
    idealMarkupPercent: Number(existing.idealMarkupPercent),
    minimumMarkupPercent: Number(existing.minimumMarkupPercent),
  };
};

export const listCategoriesWithUsage = async (
  organizationId: string
): Promise<CatalogCategory[]> => {
  "use cache: remote";
  cacheTag(buildOrganizationCacheTags(organizationId).catalog);
  cacheLife("hours");

  const rows = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        description: categories.description,
        id: categories.id,
        isSystem: categories.isSystem,
        key: categories.key,
        name: categories.name,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          eq(products.organizationId, organizationId)
        )
      )
      .where(eq(categories.organizationId, organizationId))
      .groupBy(categories.id)
      .orderBy(desc(categories.isSystem), asc(categories.name))
  );

  return rows.map((row) => ({
    ...row,
    productCount: Number(row.productCount),
  }));
};

export const createCategory = (organizationId: string, input: unknown) => {
  const parsed = categorySchema.parse(input);

  return withTenantContext(organizationId, (tx) =>
    tx.insert(categories).values({
      ...parsed,
      key: crypto.randomUUID(),
      organizationId,
    })
  );
};

export const updateCategory = async (
  organizationId: string,
  id: string,
  input: unknown
) => {
  const parsed = categorySchema.parse(input);
  await withTenantContext(organizationId, async (tx) => {
    const category = await tx.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.organizationId, organizationId)
      ),
    });

    if (!category) {
      throw new Error("Categoria nao encontrada.");
    }

    if (!canRenameCategory(category)) {
      throw new Error("A categoria Outros e protegida pelo sistema.");
    }

    const updatedRows = await tx
      .update(categories)
      .set(parsed)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, organizationId)
        )
      )
      .returning({ id: categories.id });

    if (updatedRows.length === 0) {
      throw new Error("Categoria nao encontrada.");
    }
  });
};

export const deleteCategory = async (organizationId: string, id: string) => {
  await withTenantContext(organizationId, async (tx) => {
    const category = await tx.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.organizationId, organizationId)
      ),
    });

    if (!category) {
      throw new Error("Categoria nao encontrada.");
    }

    const [{ total }] = await tx
      .select({
        total: count(products.id),
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, id),
          eq(products.organizationId, organizationId)
        )
      );

    if (!canDeleteCategory(category, Number(total))) {
      if (!canRenameCategory(category)) {
        throw new Error("A categoria Outros e protegida pelo sistema.");
      }

      throw new Error(
        "Nao e possivel remover uma categoria que ainda possui produtos vinculados."
      );
    }

    const deletedRows = await tx
      .delete(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, organizationId)
        )
      )
      .returning({ id: categories.id });

    if (deletedRows.length === 0) {
      throw new Error("Categoria nao encontrada.");
    }
  });
};

export const saveCatalogSettings = async (
  organizationId: string,
  input: unknown
) => {
  const parsed = catalogSettingsSchema.parse(input);
  const cardInstallmentRules = normalizeCardInstallmentRules(
    parsed.cardInstallmentRules
  );

  await withTenantContext(organizationId, (tx) =>
    tx
      .insert(systemSettings)
      .values({
        id: GLOBAL_SETTINGS_ID,
        idealMarkupPercent: parsed.idealMarkupPercent.toFixed(2),
        minimumMarkupPercent: parsed.minimumMarkupPercent.toFixed(2),
        organizationId,
        paymentFeeRules: cardInstallmentRules,
      })
      .onConflictDoUpdate({
        set: {
          idealMarkupPercent: parsed.idealMarkupPercent.toFixed(2),
          minimumMarkupPercent: parsed.minimumMarkupPercent.toFixed(2),
          paymentFeeRules: cardInstallmentRules,
          updatedAt: new Date(),
        },
        target: [systemSettings.organizationId, systemSettings.id],
      })
  );
};

export const getProductCategoryById = async (
  organizationId: string,
  id: string
) =>
  withTenantContext(organizationId, (tx) =>
    tx.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.organizationId, organizationId)
      ),
    })
  );
