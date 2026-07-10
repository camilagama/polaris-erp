import { z } from "zod";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { checkRateLimit, getRateLimitKeyFromRequest } from "@/lib/rate-limit";
import { ensureE2EBillingPlan } from "@/ops/e2e-bootstrap-billing";

const bootstrapSessionSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).optional(),
});

const LOCAL_E2E_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const isLocalProductionE2eBootstrap = (request: Request) => {
  if (
    serverEnv.NODE_ENV !== "production" ||
    serverEnv.VERCEL_ENV === "preview" ||
    serverEnv.VERCEL_ENV === "production" ||
    serverEnv.ALLOW_PLAYWRIGHT_BOOTSTRAP !== "true"
  ) {
    return false;
  }

  const requestUrl = new URL(request.url);
  const databaseUrl = process.env.DATABASE_URL;
  const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

  return (
    LOCAL_E2E_HOSTS.has(requestUrl.hostname) &&
    Boolean(e2eDatabaseUrl) &&
    databaseUrl === e2eDatabaseUrl
  );
};

const isBootstrapEnabled = (request: Request) => {
  if (serverEnv.NODE_ENV === "development" || serverEnv.NODE_ENV === "test") {
    return true;
  }

  return isLocalProductionE2eBootstrap(request);
};

const normalizeSameSite = (sameSite: string | boolean | undefined) => {
  if (typeof sameSite !== "string") {
    return "Lax" as const;
  }

  const normalizedValue = sameSite.toLowerCase();

  if (normalizedValue === "none") {
    return "None" as const;
  }

  if (normalizedValue === "strict") {
    return "Strict" as const;
  }

  return "Lax" as const;
};

const signCookieValue = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return `${value}.${Buffer.from(signature).toString("base64")}`;
};

const createSessionCookie = async (
  ctx: Awaited<typeof auth.$context>,
  sessionToken: string
) => {
  const cookieConfig = ctx.authCookies.sessionToken;
  const signedToken = await signCookieValue(sessionToken, ctx.secret);

  return {
    expires: cookieConfig.attributes.maxAge
      ? Math.floor(Date.now() / 1000) + cookieConfig.attributes.maxAge
      : undefined,
    httpOnly: cookieConfig.attributes.httpOnly ?? true,
    name: cookieConfig.name,
    path: cookieConfig.attributes.path ?? "/",
    sameSite: normalizeSameSite(cookieConfig.attributes.sameSite),
    secure: cookieConfig.attributes.secure ?? false,
    value: signedToken,
  };
};

const serializeCookie = (cookie: {
  domain?: string;
  expires?: number;
  httpOnly?: boolean;
  name: string;
  path?: string;
  sameSite?: "Lax" | "None" | "Strict";
  secure?: boolean;
  value: string;
}) => {
  const parts = [`${cookie.name}=${cookie.value}`];

  parts.push(`Path=${cookie.path ?? "/"}`);

  if (cookie.domain) {
    parts.push(`Domain=${cookie.domain}`);
  }

  if (cookie.expires) {
    parts.push(`Expires=${new Date(cookie.expires * 1000).toUTCString()}`);
  }

  if (cookie.httpOnly) {
    parts.push("HttpOnly");
  }

  if (cookie.secure) {
    parts.push("Secure");
  }

  if (cookie.sameSite) {
    parts.push(`SameSite=${cookie.sameSite}`);
  }

  return parts.join("; ");
};

export async function POST(request: Request) {
  const expectedAuthorization = serverEnv.INTERNAL_BOOTSTRAP_SECRET
    ? `Bearer ${serverEnv.INTERNAL_BOOTSTRAP_SECRET}`
    : null;
  const authorization = request.headers.get("authorization");
  const isLocalProductionE2e = isLocalProductionE2eBootstrap(request);

  if (!isBootstrapEnabled(request)) {
    return Response.json(
      {
        error:
          "Bootstrap interno disponivel apenas em development/test (uso exclusivo Playwright local/CI).",
      },
      { status: 403 }
    );
  }

  if (!expectedAuthorization) {
    return Response.json(
      {
        error: "Bootstrap interno indisponivel neste ambiente.",
      },
      { status: 503 }
    );
  }

  if (!isLocalProductionE2e) {
    const rateLimit = await checkRateLimit({
      key: getRateLimitKeyFromRequest(request, "internal-bootstrap-session"),
      limit: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.ok) {
      return Response.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        {
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
          },
          status: 429,
        }
      );
    }
  }

  if (authorization !== expectedAuthorization) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  if (isLocalProductionE2e) {
    await ensureE2EBillingPlan();
  }

  const payload = await request.json().catch(() => null);
  const parsedPayload = bootstrapSessionSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return Response.json({ error: "Payload invalido." }, { status: 400 });
  }

  const { email, name } = parsedPayload.data;
  const normalizedEmail = email.toLowerCase();
  const ctx = await auth.$context;
  const existingUser =
    await ctx.internalAdapter.findUserByEmail(normalizedEmail);
  const user =
    existingUser?.user ??
    (await ctx.internalAdapter.createUser({
      email: normalizedEmail,
      emailVerified: true,
      name: name ?? normalizedEmail,
    }));

  const session = await ctx.internalAdapter.createSession(user.id);

  if (!session) {
    return Response.json(
      {
        error: "Nao foi possivel criar a sessao interna.",
      },
      { status: 500 }
    );
  }

  const cookies = [await createSessionCookie(ctx, session.token)];
  const headers = new Headers();

  for (const cookie of cookies) {
    headers.append("set-cookie", serializeCookie(cookie));
  }

  return Response.json(
    {
      createdUser: !existingUser,
      signedIn: true,
      user: {
        email: user.email,
        id: user.id,
        name: user.name,
      },
    },
    {
      headers,
    }
  );
}
