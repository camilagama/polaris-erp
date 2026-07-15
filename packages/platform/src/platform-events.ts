import "server-only";

import { db } from "@polaris/db";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import {
  type EventOutboxListItem,
  listEventOutbox,
  listWebhookEvents,
  type QueryableDb,
  retryOutboxEvent,
  type WebhookEventListItem,
} from "@polaris/events";
import { recordPlatformAuditEvent } from "./platform-admin";

export interface PlatformEventsOverview {
  outbox: EventOutboxListItem[];
  webhooks: WebhookEventListItem[];
}

export interface RetryPlatformOutboxEventInput {
  actorPlatformAdminId: string;
  actorUserId: string;
  eventId: string;
  reason: string;
}

interface PlatformOutboxMutationTx extends QueryableDb {
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  };
}

interface PlatformOutboxMutationDb {
  transaction: <Result>(
    callback: (tx: PlatformOutboxMutationTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

export const getPlatformEventsOverview = async (
  queryableDb: QueryableDb = db
): Promise<PlatformEventsOverview> => {
  const [outbox, webhooks] = await Promise.all([
    listEventOutbox(queryableDb),
    listWebhookEvents(queryableDb),
  ]);

  return { outbox, webhooks };
};

export const getPlatformEventsOverviewForAdmin = async (
  platformAdminId: string
): Promise<PlatformEventsOverview> =>
  withPlatformAdminContext(platformAdminId, getPlatformEventsOverview);

const retryPlatformOutboxEventInTransaction = async (
  input: RetryPlatformOutboxEventInput,
  tx: PlatformOutboxMutationTx
): Promise<boolean> => {
  const retried = await retryOutboxEvent(tx, input.eventId.trim());

  if (!retried) {
    return false;
  }

  await recordPlatformAuditEvent(tx, {
    action: "outbox.retry_requested",
    actorPlatformAdminId: input.actorPlatformAdminId,
    actorUserId: input.actorUserId,
    metadata: { eventId: input.eventId.trim(), reason: input.reason.trim() },
    subjectId: input.eventId.trim(),
    subjectType: "event_outbox",
  });

  return true;
};

export const retryPlatformOutboxEvent = async (
  input: RetryPlatformOutboxEventInput,
  mutationDb?: PlatformOutboxMutationDb
): Promise<boolean> => {
  const eventId = input.eventId.trim();
  const reason = input.reason.trim();

  if (eventId.length === 0) {
    throw new Error("Outbox event retry requires an event id.");
  }

  if (reason.length === 0 || reason.length > 240) {
    throw new Error(
      "Outbox event retry requires a reason of up to 240 characters."
    );
  }

  if (mutationDb) {
    return await mutationDb.transaction((tx) =>
      retryPlatformOutboxEventInTransaction(input, tx)
    );
  }

  return await withPlatformAdminContext(input.actorPlatformAdminId, (tx) =>
    retryPlatformOutboxEventInTransaction(
      input,
      tx as unknown as PlatformOutboxMutationTx
    )
  );
};
