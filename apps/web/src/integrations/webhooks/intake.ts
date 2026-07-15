import "server-only";

import { db as defaultDb } from "@polaris/db";
import {
  captureWebhookEvent,
  enqueueOutboxEvent,
  type QueryableDb,
  type WebhookCaptureResult,
} from "@polaris/events";
import { sql } from "drizzle-orm";

type WebhookIntakeDb = Parameters<typeof captureWebhookEvent>[0] & QueryableDb;

interface TransactionalWebhookIntakeDb {
  transaction: <T>(
    callback: (transactionDb: WebhookIntakeDb) => Promise<T>
  ) => Promise<T>;
}

type WebhookIntakeStatus = "processed" | "failed";

export interface ObserveWebhookIntakeInput {
  correlationId?: string;
  eventId: string;
  eventType: string;
  headers: Record<string, string>;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  provider: string;
  rawBody: string;
  topic?: string;
}

export interface MarkWebhookIntakeProcessedInput {
  eventId: string;
  lastError?: string | null;
  provider: string;
  status: WebhookIntakeStatus;
}

const getWebhookTopic = (provider: string): string => `${provider}.webhook`;

const getWebhookIdempotencyKey = (provider: string, eventId: string): string =>
  `${provider}-webhook:${eventId}`;

export const observeWebhookIntake = (
  input: ObserveWebhookIntakeInput,
  intakeDb: TransactionalWebhookIntakeDb = defaultDb
): Promise<WebhookCaptureResult> => {
  const correlationId = input.correlationId ?? input.eventId;
  const topic = input.topic ?? getWebhookTopic(input.provider);
  const idempotencyKey =
    input.idempotencyKey ??
    getWebhookIdempotencyKey(input.provider, input.eventId);

  return intakeDb.transaction(async (transactionDb) => {
    const captureResult = await captureWebhookEvent(transactionDb, {
      correlationId,
      eventId: input.eventId,
      headers: input.headers,
      payload: input.payload,
      provider: input.provider,
      rawBody: input.rawBody,
    });

    if (captureResult === "duplicate") {
      return captureResult;
    }

    await enqueueOutboxEvent(transactionDb, {
      correlationId,
      eventType: input.eventType,
      idempotencyKey,
      payload: input.payload,
      status: "pending",
      topic,
    });

    return captureResult;
  });
};

export const markWebhookIntakeProcessed = async (
  input: MarkWebhookIntakeProcessedInput,
  queryableDb: QueryableDb = defaultDb
): Promise<void> => {
  await queryableDb.execute(sql`
    update webhook_events
    set status = ${input.status},
        processed_at = now(),
        last_error = ${input.lastError ?? null},
        updated_at = now()
    where provider = ${input.provider}
      and provider_event_id = ${input.eventId}
  `);
};
