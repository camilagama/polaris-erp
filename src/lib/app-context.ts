export const ORGANIZATION_ROLES = ["operator", "admin", "owner"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type AppPermission =
  | "analytics:read"
  | "catalog:read"
  | "products:write"
  | "sales:write"
  | "settings:write"
  | "members:write"
  | "organization:delete";

const roleRank: Record<OrganizationRole, number> = {
  admin: 3,
  operator: 2,
  owner: 4,
};

const permissionMinimumRole: Record<AppPermission, OrganizationRole> = {
  "analytics:read": "operator",
  "catalog:read": "operator",
  "members:write": "admin",
  "organization:delete": "owner",
  "products:write": "operator",
  "sales:write": "operator",
  "settings:write": "admin",
};

const NON_SLUG_CHARACTERS_PATTERN = /[^a-z0-9]+/g;
const SLUG_BOUNDARY_PATTERN = /^-|-$/g;

export const getRoleRank = (role: OrganizationRole): number => roleRank[role];

export const canRolePerform = (
  role: OrganizationRole,
  permission: AppPermission
): boolean =>
  getRoleRank(role) >= getRoleRank(permissionMinimumRole[permission]);

export const resolveDefaultOrganizationSlug = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(NON_SLUG_CHARACTERS_PATTERN, "-")
    .replace(SLUG_BOUNDARY_PATTERN, "");

  return slug || "organization";
};
