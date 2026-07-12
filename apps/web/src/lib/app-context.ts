export const ORGANIZATION_ROLES = ["operator", "admin", "owner"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type AppPermission =
  | "analytics:read"
  | "catalog:read"
  | "products:write"
  | "sales:write"
  | "settings:write"
  | "organization:delete";

const roleRank: Record<OrganizationRole, number> = {
  admin: 3,
  operator: 2,
  owner: 4,
};

const permissionMinimumRole: Record<AppPermission, OrganizationRole> = {
  "analytics:read": "operator",
  "catalog:read": "operator",
  "organization:delete": "owner",
  "products:write": "operator",
  "sales:write": "operator",
  "settings:write": "admin",
};

export const getRoleRank = (role: OrganizationRole): number => roleRank[role];

export const canRolePerform = (
  role: OrganizationRole,
  permission: AppPermission
): boolean =>
  getRoleRank(role) >= getRoleRank(permissionMinimumRole[permission]);
