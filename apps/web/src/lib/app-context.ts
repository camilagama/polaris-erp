export const ORGANIZATION_ROLES = ["owner"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type AppPermission =
  | "analytics:read"
  | "catalog:read"
  | "inventory:write"
  | "products:write"
  | "sales:write"
  | "settings:write"
  | "organization:delete";

const roleRank: Record<OrganizationRole, number> = {
  owner: 1,
};

const permissionMinimumRole: Record<AppPermission, OrganizationRole> = {
  "analytics:read": "owner",
  "catalog:read": "owner",
  "inventory:write": "owner",
  "organization:delete": "owner",
  "products:write": "owner",
  "sales:write": "owner",
  "settings:write": "owner",
};

export const getRoleRank = (role: OrganizationRole): number => roleRank[role];

export const canRolePerform = (
  role: OrganizationRole,
  permission: AppPermission
): boolean =>
  getRoleRank(role) >= getRoleRank(permissionMinimumRole[permission]);
