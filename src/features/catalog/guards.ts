import { OTHERS_CATEGORY_KEY } from "@/lib/catalog-defaults";

interface CategoryGuardInput {
  isSystem: boolean;
  key: string;
}

export const isProtectedCategory = (category: CategoryGuardInput) =>
  category.isSystem || category.key === OTHERS_CATEGORY_KEY;

export const canRenameCategory = (category: CategoryGuardInput) =>
  !isProtectedCategory(category);

export const canDeleteCategory = (
  category: CategoryGuardInput,
  linkedProductsCount: number
) => !isProtectedCategory(category) && linkedProductsCount === 0;
