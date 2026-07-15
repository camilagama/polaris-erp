const LOCAL_ADMIN_APP_URL = "http://localhost:3001";
const MINIMUM_SECRET_LENGTH = 32;

export interface AdminAuthEnvironment {
  ADMIN_APP_URL?: string;
  ADMIN_BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  ADMIN_GOOGLE_CLIENT_ID?: string;
  ADMIN_GOOGLE_CLIENT_SECRET?: string;
  NODE_ENV?: string;
}

export interface AdminAuthOptions {
  baseUrl: string;
  hasGoogleAuth: boolean;
  secret: string;
}

const getOptionalValue = (value: string | undefined): string | undefined => {
  const normalizedValue = value?.trim();

  return normalizedValue || undefined;
};

export const resolveAdminAuthOptions = (
  environment: AdminAuthEnvironment
): AdminAuthOptions => {
  const isProduction = environment.NODE_ENV === "production";
  const baseUrl = getOptionalValue(environment.ADMIN_APP_URL) ?? LOCAL_ADMIN_APP_URL;
  const configuredSecret = getOptionalValue(environment.ADMIN_BETTER_AUTH_SECRET);
  const secret =
    configuredSecret ??
    (isProduction ? undefined : getOptionalValue(environment.BETTER_AUTH_SECRET));
  const clientId = getOptionalValue(environment.ADMIN_GOOGLE_CLIENT_ID);
  const clientSecret = getOptionalValue(environment.ADMIN_GOOGLE_CLIENT_SECRET);

  if (!secret || (isProduction && secret.length < MINIMUM_SECRET_LENGTH)) {
    throw new Error(
      "ADMIN_BETTER_AUTH_SECRET must be configured securely (it may only fall back to BETTER_AUTH_SECRET outside production)."
    );
  }

  if (isProduction && !(clientId && clientSecret)) {
    throw new Error(
      "ADMIN_GOOGLE_CLIENT_ID and ADMIN_GOOGLE_CLIENT_SECRET are required in production."
    );
  }

  return {
    baseUrl: new URL(baseUrl).origin,
    hasGoogleAuth: Boolean(clientId && clientSecret),
    secret,
  };
};
