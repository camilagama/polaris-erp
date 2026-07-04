import "server-only";

import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

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

const getWindowLabel = (windowMs: number): Duration => {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  return `${seconds} s`;
};

const getUpstashRedis = () => {
  if (redis !== undefined) {
    return redis;
  }

  if (
    !(serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN)
  ) {
    redis = null;
    return null;
  }

  redis = new Redis({
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    url: serverEnv.UPSTASH_REDIS_REST_URL,
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

export const checkRateLimit = async (
  input: RateLimitInput
): Promise<RateLimitResult> => {
  const limiter = getUpstashLimiter(input);

  if (!limiter) {
    if (serverEnv.NODE_ENV === "production") {
      const resetAt = Date.now() + input.windowMs;

      return {
        ok: false,
        resetAt,
        retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      };
    }

    return checkLocalRateLimit(input);
  }

  const result = await limiter.limit(input.key);

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

export const getRateLimitKeyFromRequest = (request: Request, scope: string) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip =
    forwardedFor?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  return `${scope}:${ip}`;
};
