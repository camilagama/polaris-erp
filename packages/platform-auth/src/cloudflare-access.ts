import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { headers } from "next/headers";

const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export interface CloudflareAccessConfig {
  audience: string | undefined;
  enforce: boolean;
  teamDomain: string | undefined;
}

export interface CloudflareAccessIdentity {
  email: string | null;
  subject: string;
}

interface VerifiedCloudflareAccessConfig {
  audience: string;
  teamDomain: string;
}

export type VerifyCloudflareAccessJwt = (
  token: string,
  config: VerifiedCloudflareAccessConfig
) => Promise<CloudflareAccessIdentity>;

const jwksByTeamDomain = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

const shouldEnforceAccess = (): boolean =>
  process.env.NODE_ENV === "production" &&
  (process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "production");

const normalizeTeamDomain = (teamDomain: string): string => {
  const withProtocol = teamDomain.startsWith("http")
    ? teamDomain
    : `https://${teamDomain}`;

  return withProtocol.replace(/\/+$/g, "");
};

const getCloudflareAccessConfig = (): CloudflareAccessConfig => ({
  audience: process.env.CLOUDFLARE_ACCESS_AUD,
  enforce: shouldEnforceAccess(),
  teamDomain: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
});

const getJwks = (teamDomain: string) => {
  const existingJwks = jwksByTeamDomain.get(teamDomain);

  if (existingJwks) {
    return existingJwks;
  }

  const jwks = createRemoteJWKSet(
    new URL(`${teamDomain}/cdn-cgi/access/certs`)
  );
  jwksByTeamDomain.set(teamDomain, jwks);

  return jwks;
};

const verifyJwtWithJose: VerifyCloudflareAccessJwt = async (token, config) => {
  const { payload } = await jwtVerify(token, getJwks(config.teamDomain), {
    audience: config.audience,
    issuer: config.teamDomain,
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Cloudflare Access token is missing a subject.");
  }

  return {
    email: typeof payload.email === "string" ? payload.email : null,
    subject: payload.sub,
  };
};

export const verifyCloudflareAccessHeaders = async (
  requestHeaders: Headers,
  config: CloudflareAccessConfig = getCloudflareAccessConfig(),
  verifyJwt: VerifyCloudflareAccessJwt = verifyJwtWithJose
): Promise<CloudflareAccessIdentity | null> => {
  if (!(config.audience && config.teamDomain)) {
    if (config.enforce) {
      throw new Error("Cloudflare Access is not configured.");
    }

    return null;
  }

  const token = requestHeaders.get(ACCESS_JWT_HEADER);

  if (!token) {
    throw new Error("Cloudflare Access assertion is missing.");
  }

  return await verifyJwt(token, {
    audience: config.audience,
    teamDomain: normalizeTeamDomain(config.teamDomain),
  });
};

export const verifyCloudflareAccess =
  async (): Promise<CloudflareAccessIdentity | null> =>
    verifyCloudflareAccessHeaders(await headers());
