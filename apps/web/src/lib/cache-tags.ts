export const buildOrganizationCacheTags = (organizationId: string) =>
  ({
    analytics: `analytics:${organizationId}`,
    catalog: `catalog:${organizationId}`,
  }) as const;
