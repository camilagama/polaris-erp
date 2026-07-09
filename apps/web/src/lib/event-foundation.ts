import "server-only";

import { createHash } from "node:crypto";
import { type SQL, sql } from "drizzle-orm";
import type { IndexColumn } from "drizzle-orm/pg-core";
import { webhookEvents } from "@/db/schema";

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-asaas-access-token",
  "x-webhook-signature",
  "svix-signature",
]);

export interface CaptureWebhookEventInput {
  correlationId: string;
  eventId: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
  provider: string;
  rawBody: string;
}

type WebhookEventInsert = typeof webhookEvents.$inferInsert;

interface InsertableDb {
  insert: (table: typeof webhookEvents) => {
    values: (value: WebhookEventInsert) => {
      onConflictDoNothing: (config?: {
        target?: IndexColumn | IndexColumn[];
      }) => Promise<unknown> | unknown;
    };
  };
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

export interface EventOutboxListItem {
  attempts: number;
  availableAt: string | null;
  correlationId: string;
  eventType: string;
  id: string;
  lastError: string | null;
  status: string;
  topic: string;
}

export interface WebhookEventListItem {
  correlationId: string;
  id: string;
  lastError: string | null;
  provider: string;
  providerEventId: string;
  receivedAt: string | null;
  status: string;
}

export const buildWebhookEventKey = (
  provider: string,
  eventId: string
): string => `${provider.trim().toLowerCase()}:${eventId.trim()}`;

export const hashRawBody = (rawBody: string): string =>
  createHash("sha256").update(rawBody).digest("hex");

export const redactWebhookHeaders = (
  headers: Record<string, string>
): Record<string, string> => {
  const redacted: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.toLowerCase();
    redacted[normalizedName] = SENSITIVE_HEADER_NAMES.has(normalizedName)
      ? "[redacted]"
      : value;
  }

  return redacted;
};

export const captureWebhookEvent = async (
  db: InsertableDb,
  input: CaptureWebhookEventInput
): Promise<void> => {
  const idempotencyKey = buildWebhookEventKey(input.provider, input.eventId);

  await db
    .insert(webhookEvents)
    .values({
      correlationId: input.correlationId,
      idempotencyKey,
      payload: input.payload,
      provider: input.provider,
      providerEventId: input.eventId,
      rawBodySha256: hashRawBody(input.rawBody),
      redactedHeaders: redactWebhookHeaders(input.headers),
    })
    .onConflictDoNothing({
      target: webhookEvents.idempotencyKey,
    });
};

const toRows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) {
    return result.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null
    );
  }

  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    if (Array.isArray(rows)) {
      return rows.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null
      );
    }
  }

  return [];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
};

const toStringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const listEventOutbox = async (
  db: QueryableDb
): Promise<EventOutboxListItem[]> => {
  const rows = toRows(
    await db.execute(sql`
      select id, topic, event_type, correlation_id, status, attempts, available_at, last_error
      from event_outbox
      order by created_at desc
      limit 50
    `)
  );

  return rows.map((row) => ({
    attempts: toNumber(row.attempts),
    availableAt: toIsoString(row.available_at),
    correlationId: toStringValue(row.correlation_id),
    eventType: toStringValue(row.event_type),
    id: toStringValue(row.id),
    lastError: toStringValue(row.last_error) || null,
    status: toStringValue(row.status),
    topic: toStringValue(row.topic),
  }));
};

export const listWebhookEvents = async (
  db: QueryableDb
): Promise<WebhookEventListItem[]> => {
  const rows = toRows(
    await db.execute(sql`
      select id, provider, provider_event_id, correlation_id, status, last_error, created_at
      from webhook_events
      order by created_at desc
      limit 50
    `)
  );

  return rows.map((row) => ({
    correlationId: toStringValue(row.correlation_id),
    id: toStringValue(row.id),
    lastError: toStringValue(row.last_error) || null,
    provider: toStringValue(row.provider),
    providerEventId: toStringValue(row.provider_event_id),
    receivedAt: toIsoString(row.created_at),
    status: toStringValue(row.status),
  }));
};

export const retryOutboxEvent = async (
  db: QueryableDb,
  eventId: string
): Promise<void> => {
  await db.execute(sql`
    update event_outbox
    set status = 'pending',
        available_at = now(),
        last_error = null,
        updated_at = now()
    where id = ${eventId}
      and status in ('failed', 'dead_letter')
  `);
};
