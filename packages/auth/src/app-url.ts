const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";

export type AppUrlMode = "local" | "public" | "tunnel";

export interface AppUrlEnv {
  APP_LOCAL_URL?: string;
  APP_PUBLIC_URL?: string;
  APP_URL_MODE?: string;
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
}

const normalizeUrl = (value: string): string => new URL(value.trim()).origin;

const getOptionalUrl = (value: string | undefined): string | undefined => {
  const trimmedValue = value?.trim();
  return trimmedValue ? normalizeUrl(trimmedValue) : undefined;
};

const getDefaultMode = (env: AppUrlEnv): AppUrlMode => {
  if (env.VERCEL_ENV || env.NODE_ENV === "production") {
    return "public";
  }

  return "local";
};

const getMode = (env: AppUrlEnv): AppUrlMode => {
  const mode = env.APP_URL_MODE?.trim();

  if (!mode) {
    return getDefaultMode(env);
  }

  if (mode === "local" || mode === "public" || mode === "tunnel") {
    return mode;
  }

  throw new Error("APP_URL_MODE must be local, public, or tunnel.");
};

export const resolveCanonicalAppUrl = (env: AppUrlEnv): string => {
  const mode = getMode(env);

  if (mode === "local") {
    return getOptionalUrl(env.APP_LOCAL_URL) ?? DEFAULT_LOCAL_APP_URL;
  }

  const publicUrl =
    getOptionalUrl(env.APP_PUBLIC_URL) ??
    getOptionalUrl(env.NEXT_PUBLIC_APP_URL) ??
    getOptionalUrl(env.BETTER_AUTH_URL);

  if (!publicUrl) {
    throw new Error(
      "APP_PUBLIC_URL or NEXT_PUBLIC_APP_URL is required when APP_URL_MODE is public or tunnel."
    );
  }

  return publicUrl;
};
