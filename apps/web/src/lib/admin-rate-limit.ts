import "server-only";

import { headers } from "next/headers";
import { checkRateLimit, getRateLimitKeyFromHeaders } from "@/lib/rate-limit";

const DEFAULT_ADMIN_ACTION_LIMIT = 5;
const DEFAULT_ADMIN_ACTION_WINDOW_MS = 60_000;

interface AdminRateLimitInput {
  action: string;
  actorUserId: string;
  limit?: number;
  targetId?: string;
  windowMs?: number;
}

const normalizeKeyPart = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9._:-]/g, "_");

const getAdminRateLimitScope = ({
  action,
  actorUserId,
  targetId,
}: Pick<AdminRateLimitInput, "action" | "actorUserId" | "targetId">): string =>
  [
    "admin",
    normalizeKeyPart(action),
    `actor:${normalizeKeyPart(actorUserId)}`,
    `target:${normalizeKeyPart(targetId ?? "none")}`,
  ].join(":");

export const assertAdminRateLimit = async ({
  action,
  actorUserId,
  limit = DEFAULT_ADMIN_ACTION_LIMIT,
  targetId,
  windowMs = DEFAULT_ADMIN_ACTION_WINDOW_MS,
}: AdminRateLimitInput): Promise<void> => {
  const key = getRateLimitKeyFromHeaders(
    await headers(),
    getAdminRateLimitScope({ action, actorUserId, targetId })
  );
  const result = await checkRateLimit({ key, limit, windowMs });

  if (!result.ok) {
    throw new Error(
      `Admin action rate limit exceeded. Retry after ${result.retryAfterSeconds} seconds.`
    );
  }
};
