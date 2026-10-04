export const shouldLoadLocalAdminAuthEnvironment = (
  environment: NodeJS.ProcessEnv
): boolean => environment.ALLOW_PLAYWRIGHT_BOOTSTRAP !== "true";
