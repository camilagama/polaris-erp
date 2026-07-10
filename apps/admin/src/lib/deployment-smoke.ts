export interface AdminDeploymentSmokeOptions {
  baseUrl?: string;
  expectProtected?: boolean;
  fetcher?: (input: URL, init?: RequestInit) => Promise<Response>;
}

export interface AdminDeploymentSmokeResult {
  healthUrl: string;
  protectedByVercelAuthentication: boolean;
  status: "ok" | "protected";
}

const PROTECTED_STATUS_CODES = new Set([401, 403]);

const normalizeBaseUrl = (value: string): URL => {
  try {
    return new URL(value);
  } catch {
    throw new Error("ADMIN_DEPLOYMENT_SMOKE_URL must be a valid URL.");
  }
};

export const isTruthySmokeEnv = (value: string | undefined): boolean =>
  value === "1" || value?.toLowerCase() === "true";

export async function runAdminDeploymentSmoke({
  baseUrl,
  expectProtected = false,
  fetcher = fetch,
}: AdminDeploymentSmokeOptions): Promise<AdminDeploymentSmokeResult> {
  if (!baseUrl) {
    throw new Error("ADMIN_DEPLOYMENT_SMOKE_URL is required.");
  }

  const healthUrl = new URL("/api/health", normalizeBaseUrl(baseUrl));
  const response = await fetcher(healthUrl, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (expectProtected && PROTECTED_STATUS_CODES.has(response.status)) {
    return {
      healthUrl: healthUrl.toString(),
      protectedByVercelAuthentication: true,
      status: "protected",
    };
  }

  if (!response.ok) {
    throw new Error(
      `Admin health smoke failed with HTTP ${response.status} for ${healthUrl.toString()}.`
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    ok?: unknown;
    service?: unknown;
  } | null;

  if (payload?.ok !== true || payload.service !== "polaris-admin") {
    throw new Error("Admin health smoke returned an unexpected payload.");
  }

  return {
    healthUrl: healthUrl.toString(),
    protectedByVercelAuthentication: false,
    status: "ok",
  };
}
