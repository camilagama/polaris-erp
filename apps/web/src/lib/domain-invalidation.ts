import "server-only";

import { refresh, revalidatePath, updateTag } from "next/cache";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

export const productCreated = ({
  organizationId,
  productId,
}: {
  organizationId: string;
  productId: string;
}): void => {
  const tags = buildOrganizationCacheTags(organizationId);

  revalidatePath("/produtos");
  updateTag(tags.catalog);
  updateTag(tags.analytics);
  revalidatePath(`/produtos/${productId}`);
};

export const productDetailsChanged = ({
  organizationId,
  productId,
}: {
  organizationId: string;
  productId: string;
}): void => {
  revalidatePath("/produtos");
  updateTag(buildOrganizationCacheTags(organizationId).catalog);
  revalidatePath(`/produtos/${productId}`);
};

export const productInventoryChanged = ({
  organizationId,
  productId,
}: {
  organizationId: string;
  productId: string;
}): void => {
  revalidatePath("/produtos");
  updateTag(buildOrganizationCacheTags(organizationId).analytics);
  revalidatePath(`/produtos/${productId}`);
};

export const saleChanged = ({
  organizationId,
  saleId,
}: {
  organizationId: string;
  saleId: string;
}): void => {
  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/produtos/[id]", "page");
  updateTag(buildOrganizationCacheTags(organizationId).analytics);
  revalidatePath(`/vendas/${saleId}`);
};

export const catalogConfigurationChanged = (organizationId: string): void => {
  updateTag(buildOrganizationCacheTags(organizationId).catalog);
  refresh();
};
