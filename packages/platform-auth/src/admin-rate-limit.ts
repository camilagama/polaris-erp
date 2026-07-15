import "server-only";

import { isIP } from "node:net";
import { captureMessage } from "@sentry/nextjs";
import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const DEFAULT_ADMIN_ACTION_LIMIT = 5;
const DEFAULT_ADMIN_ACTION_WINDOW_MS = 60_000;

interface AdminRateLimitInput {
  action: string;
  actorAdminUserId: string;
  limit?: number;
  targetId?: string;
  windowMs?: number;
}

interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSeconds: number; resetAt: number };

const buckets = new Map<string, RateLimitBucket>();
const upstashLimiters = new Map<string, Ratelimit>();
let redis: Redis | null | undefined;

const normalizeKeyPart = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9._:-]/g, "_");

const getWindowLabel = (windowMs: number): Duration => {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  return `${seconds} s`;
};

const getUpstashRedis = () => {
  if (redis !== undefined) {
    return redis;
  }

  if (
    !(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    )
  ) {
    redis = null;
    return null;
  }

  redis = new Redis({
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    url: process.env.UPSTASH_REDIS_REST_URL,
  });

  return redis;
};

const getUpstashLimiter = ({
  limit,
  windowMs,
}: Omit<RateLimitInput, "key">) => {
  const redis = getUpstashRedis();

  if (!redis) {
    return null;
  }

  const cacheKey = `${limit}:${windowMs}`;
  const existing = upstashLimiters.get(cacheKey);

  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    analytics: true,
    limiter: Ratelimit.slidingWindow(limit, getWindowLabel(windowMs)),
    prefix: "dgimports:ratelimit",
    redis,
  });

  upstashLimiters.set(cacheKey, limiter);
  return limiter;
};

const checkLocalRateLimit = ({
  key,
  limit,
  windowMs,
}: RateLimitInput): RateLimitResult => {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });

    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;

  return {
    ok: true,
    remaining: limit - current.count,
    resetAt: current.resetAt,
  };
};

const reportRateLimitProviderFailure = (): void => {
  if (process.env.SENTRY_DSN) {
    captureMessage("rate_limit.provider_unavailable", {
      level: "warning",
      tags: {
        provider: "upstash",
        response: "fail_closed",
      },
    });
  }
};

const checkRateLimit = async (
  input: RateLimitInput
): Promise<RateLimitResult> => {
  const limiter = getUpstashLimiter(input);

  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      const resetAt = Date.now() + input.windowMs;

      return {
        ok: false,
        resetAt,
        retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      };
    }

    return checkLocalRateLimit(input);
  }

  const result = await limiter.limit(input.key).catch(() => null);

  if (!result) {
    reportRateLimitProviderFailure();

    if (process.env.NODE_ENV === "production") {
      const resetAt = Date.now() + input.windowMs;

      return {
        ok: false,
        resetAt,
        retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      };
    }

    return checkLocalRateLimit(input);
  }

  if (!result.success) {
    return {
      ok: false,
      resetAt: result.reset,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      ),
    };
  }

  return {
    ok: true,
    remaining: result.remaining,
    resetAt: result.reset,
  };
};

const getFirstValidIp = (value: string | null) =>
  value
    ?.split(",")
    .map((candidate) => candidate.trim())
    .find((candidate) => isIP(candidate) !== 0);

const getRateLimitKeyFromHeaders = (
  requestHeaders: Pick<Headers, "get">,
  scope: string
) => {
  const ip =
    getFirstValidIp(requestHeaders.get("x-forwarded-for")) ||
    getFirstValidIp(requestHeaders.get("x-real-ip")) ||
    getFirstValidIp(requestHeaders.get("cf-connecting-ip")) ||
    "unknown";

  return `${scope}:${ip}`;
};

const getAdminRateLimitScope = ({
  action,
  actorAdminUserId,
  targetId,
}: Pick<
  AdminRateLimitInput,
  "action" | "actorAdminUserId" | "targetId"
>): string =>
  [
    "admin",
    normalizeKeyPart(action),
    `actor:${normalizeKeyPart(actorAdminUserId)}`,
    `target:${normalizeKeyPart(targetId ?? "none")}`,
  ].join(":");

export const assertAdminRateLimit = async ({
  action,
  actorAdminUserId,
  limit = DEFAULT_ADMIN_ACTION_LIMIT,
  targetId,
  windowMs = DEFAULT_ADMIN_ACTION_WINDOW_MS,
}: AdminRateLimitInput): Promise<void> => {
  const key = getRateLimitKeyFromHeaders(
    await headers(),
    getAdminRateLimitScope({ action, actorAdminUserId, targetId })
  );
  const result = await checkRateLimit({ key, limit, windowMs });

  if (!result.ok) {
    throw new Error(
      `Admin action rate limit exceeded. Retry after ${result.retryAfterSeconds} seconds.`
    );
  }
};
