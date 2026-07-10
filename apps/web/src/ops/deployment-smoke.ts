interface DeploymentSmokeCheck {
  name:
    | "bootstrap-forbidden"
    | "google-oauth-redirect"
    | "health"
    | "r2-health"
    | "sign-in-page";
  ok: boolean;
  status: number;
}

interface DeploymentSmokeResult {
  checks: DeploymentSmokeCheck[];
  ok: boolean;
}

interface DeploymentSmokeInput {
  appUrl: string;
  fetcher: typeof fetch;
  r2HealthSecret?: string;
}

const createUrl = (appUrl: string, pathname: string): string => {
  let url: URL;

  try {
    url = new URL(appUrl);
  } catch {
    throw new Error("DEPLOYMENT_SMOKE_URL precisa ser uma URL http(s).");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("DEPLOYMENT_SMOKE_URL precisa ser uma URL http(s).");
  }

  url.pathname = pathname;
  url.search = "";
  url.hash = "";

  return url.toString();
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isHealthyPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as {
    checks?: { database?: { ok?: unknown } };
    ok?: unknown;
  };

  return record.ok === true && record.checks?.database?.ok === true;
};

const isGoogleOAuthRedirect = (response: Response): boolean => {
  if (response.status < 300 || response.status > 399) {
    return false;
  }

  const location = response.headers.get("location");

  if (!location) {
    return false;
  }

  try {
    return new URL(location).hostname === "accounts.google.com";
  } catch {
    return false;
  }
};

export async function runDeploymentSmoke({
  appUrl,
  fetcher,
  r2HealthSecret,
}: DeploymentSmokeInput): Promise<DeploymentSmokeResult> {
  const checks: DeploymentSmokeCheck[] = [];
  const healthResponse = await fetcher(createUrl(appUrl, "/api/health"), {
    method: "GET",
  });
  const healthPayload = await readJson(healthResponse);
  const healthOk =
    healthResponse.status === 200 && isHealthyPayload(healthPayload);

  checks.push({
    name: "health",
    ok: healthOk,
    status: healthResponse.status,
  });

  if (!healthOk) {
    return {
      checks,
      ok: false,
    };
  }

  const signInResponse = await fetcher(createUrl(appUrl, "/sign-in"), {
    method: "GET",
  });
  const signInOk = signInResponse.status === 200;

  checks.push({
    name: "sign-in-page",
    ok: signInOk,
    status: signInResponse.status,
  });

  const googleOAuthResponse = await fetcher(
    createUrl(appUrl, "/api/auth/google"),
    {
      method: "GET",
      redirect: "manual",
    }
  );

  checks.push({
    name: "google-oauth-redirect",
    ok: isGoogleOAuthRedirect(googleOAuthResponse),
    status: googleOAuthResponse.status,
  });

  const bootstrapResponse = await fetcher(
    createUrl(appUrl, "/api/auth/dev/bootstrap-session"),
    {
      body: JSON.stringify({
        email: "deployment-smoke@example.invalid",
        name: "Deployment Smoke",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }
  );
  const bootstrapOk = bootstrapResponse.status === 403;

  checks.push({
    name: "bootstrap-forbidden",
    ok: bootstrapOk,
    status: bootstrapResponse.status,
  });

  if (r2HealthSecret) {
    const r2HealthResponse = await fetcher(
      createUrl(appUrl, "/api/internal/health/r2"),
      {
        headers: {
          authorization: `Bearer ${r2HealthSecret}`,
        },
        method: "GET",
      }
    );

    checks.push({
      name: "r2-health",
      ok: r2HealthResponse.status === 200,
      status: r2HealthResponse.status,
    });
  }

  return {
    checks,
    ok: checks.every((check) => check.ok),
  };
}
