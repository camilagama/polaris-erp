export const E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET =
  "dgimports-e2e-bootstrap-local-only";

interface E2eDatabaseEnv extends Record<string, string | undefined> {
  E2E_DATABASE_URL?: string;
}

const E2E_DATABASE_URL_REQUIRED_MESSAGE =
  "E2E_DATABASE_URL is required and must point to an isolated database. See docs/architecture/database-environments.md.";

export const requireE2eDatabaseUrl = (env: E2eDatabaseEnv): string => {
  const e2eDatabaseUrl = env.E2E_DATABASE_URL?.trim();

  if (!e2eDatabaseUrl) {
    throw new Error(E2E_DATABASE_URL_REQUIRED_MESSAGE);
  }

  return e2eDatabaseUrl;
};

export const createE2eServerEnv = (
  env: NodeJS.ProcessEnv
): Record<string, string> => {
  const e2eDatabaseUrl = requireE2eDatabaseUrl(env);
  const values: NodeJS.ProcessEnv = {
    ...env,
    ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
    DATABASE_URL: e2eDatabaseUrl,
    INTERNAL_BOOTSTRAP_SECRET:
      env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
      E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
    NODE_ENV: "production",
  };
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};

export const parseE2eSetCookie = (cookieHeader: string, baseUrl: string) => {
  const [nameValue, ...attributeEntries] = cookieHeader.split("; ");
  const separatorIndex = nameValue.indexOf("=");

  if (separatorIndex === -1) {
    throw new Error(`Invalid Set-Cookie header: ${cookieHeader}`);
  }

  const attributes = new Map(
    attributeEntries.map((entry) => {
      const attributeSeparatorIndex = entry.indexOf("=");

      if (attributeSeparatorIndex === -1) {
        return [entry.toLowerCase(), "true"] as const;
      }

      return [
        entry.slice(0, attributeSeparatorIndex).toLowerCase(),
        entry.slice(attributeSeparatorIndex + 1),
      ] as const;
    })
  );
  const sameSite = attributes.get("samesite")?.toLowerCase();
  let normalizedSameSite: "Lax" | "None" | "Strict" = "Lax";

  if (sameSite === "strict") {
    normalizedSameSite = "Strict";
  } else if (sameSite === "none") {
    normalizedSameSite = "None";
  }

  return {
    domain: attributes.get("domain") ?? new URL(baseUrl).hostname,
    expires: attributes.get("expires")
      ? Math.floor(Date.parse(attributes.get("expires") ?? "") / 1000)
      : undefined,
    httpOnly: attributes.has("httponly"),
    name: nameValue.slice(0, separatorIndex),
    path: attributes.get("path") ?? "/",
    sameSite: normalizedSameSite,
    secure: attributes.has("secure"),
    value: nameValue.slice(separatorIndex + 1),
  } as const;
};
