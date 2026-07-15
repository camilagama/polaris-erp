import { serverEnv } from "@polaris/auth/env";
import { bootstrapPlatformAdmin } from "@polaris/platform/admin";
import { z } from "zod";
import { auth } from "@/lib/auth";

const LOCAL_E2E_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const E2E_PLATFORM_ADMIN_GRANT_TTL_MS = 86_400_000;

const bootstrapPlatformAdminSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).optional(),
  role: z.enum(["owner", "operator", "support"]).optional(),
});

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

const serializeCookie = (cookie: {
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

export async function POST(request: Request) {
  const expectedAuthorization = serverEnv.INTERNAL_BOOTSTRAP_SECRET
    ? `Bearer ${serverEnv.INTERNAL_BOOTSTRAP_SECRET}`
    : null;

  if (!isLocalProductionE2eBootstrap(request)) {
    return Response.json(
      {
        error:
          "Bootstrap admin disponivel apenas para Playwright local/CI com E2E_DATABASE_URL isolado.",
      },
      { status: 403 }
    );
  }

  if (!expectedAuthorization) {
    return Response.json(
      {
        error: "Bootstrap admin indisponivel neste ambiente.",
      },
      { status: 503 }
    );
  }

  if (request.headers.get("authorization") !== expectedAuthorization) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsedPayload = bootstrapPlatformAdminSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return Response.json({ error: "Payload invalido." }, { status: 400 });
  }

  const { email, name, role = "owner" } = parsedPayload.data;
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

  const platformAdminId = await bootstrapPlatformAdmin({
    expiresAt: new Date(Date.now() + E2E_PLATFORM_ADMIN_GRANT_TTL_MS),
    reason: "Playwright admin E2E bootstrap",
    role,
    userId: user.id,
  });
  const session = await ctx.internalAdapter.createSession(user.id);

  if (!session) {
    return Response.json(
      {
        error: "Nao foi possivel criar a sessao admin E2E.",
      },
      { status: 500 }
    );
  }

  const headers = new Headers();
  headers.append(
    "set-cookie",
    serializeCookie(await createSessionCookie(ctx, session.token))
  );

  return Response.json(
    {
      platformAdminId,
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
