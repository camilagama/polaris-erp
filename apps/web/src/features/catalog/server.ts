import "server-only";

import {
  auditEvents,
  categories,
  products,
  systemSettings,
} from "@polaris/db/schema";
import {
  type TenantTransaction,
  withTenantContext,
} from "@polaris/db/tenant-context";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
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

interface CatalogAuditEventInput {
  actorUserId: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  subjectId?: string | null;
  subjectType: string;
  type: string;
}

const insertCatalogAuditEvent = (
  tx: TenantTransaction,
  {
    actorUserId,
    metadata = {},
    organizationId,
    subjectId = null,
    subjectType,
    type,
  }: CatalogAuditEventInput
) =>
  tx.insert(auditEvents).values({
    actorUserId,
    metadata,
    organizationId,
    subjectId,
    subjectType,
    type,
  });

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

export const createCategory = (
  organizationId: string,
  actorUserId: string,
  input: unknown
) => {
  const parsed = categorySchema.parse(input);

  return withTenantContext(organizationId, async (tx) => {
    const [createdCategory] = await tx
      .insert(categories)
      .values({
        ...parsed,
        key: crypto.randomUUID(),
        organizationId,
      })
      .returning({ id: categories.id });

    await insertCatalogAuditEvent(tx, {
      actorUserId,
      metadata: { name: parsed.name },
      organizationId,
      subjectId: createdCategory?.id ?? null,
      subjectType: "category",
      type: "category.created",
    });
  });
};

export const updateCategory = async (
  organizationId: string,
  actorUserId: string,
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

    await insertCatalogAuditEvent(tx, {
      actorUserId,
      metadata: { name: parsed.name },
      organizationId,
      subjectId: id,
      subjectType: "category",
      type: "category.updated",
    });
  });
};

export const deleteCategory = async (
  organizationId: string,
  actorUserId: string,
  id: string
) => {
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

    await insertCatalogAuditEvent(tx, {
      actorUserId,
      organizationId,
      subjectId: id,
      subjectType: "category",
      type: "category.deleted",
    });
  });
};

export const saveCatalogSettings = async (
  organizationId: string,
  actorUserId: string,
  input: unknown
) => {
  const parsed = catalogSettingsSchema.parse(input);
  const cardInstallmentRules = normalizeCardInstallmentRules(
    parsed.cardInstallmentRules
  );

  await withTenantContext(organizationId, async (tx) => {
    await tx
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
      });

    await insertCatalogAuditEvent(tx, {
      actorUserId,
      organizationId,
      subjectType: "settings",
      type: "settings.updated",
    });
  });
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
