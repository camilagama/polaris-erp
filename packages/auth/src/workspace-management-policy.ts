import { APIError } from "better-auth";

export const rejectWorkspaceUserManagement = (): never => {
  throw new APIError("FORBIDDEN", {
    code: "WORKSPACE_USER_MANAGEMENT_DISABLED",
    message: "Workspace user management is disabled for this sprint.",
  });
};

export const rejectWorkspaceOrganizationUpdate = (): never => {
  throw new APIError("FORBIDDEN", {
    code: "WORKSPACE_ORGANIZATION_UPDATE_DISABLED",
    message: "Workspace organization updates are disabled for this sprint.",
  });
};
