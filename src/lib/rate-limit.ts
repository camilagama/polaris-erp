interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export const checkRateLimit = ({
  key,
  limit,
  windowMs,
}: RateLimitInput):
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSeconds: number; resetAt: number } => {
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

export const getRateLimitKeyFromRequest = (request: Request, scope: string) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip =
    forwardedFor?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  return `${scope}:${ip}`;
};
