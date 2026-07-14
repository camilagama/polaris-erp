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

const getDefaultMutationDb = (): PlatformOutboxMutationDb =>
  db as unknown as PlatformOutboxMutationDb;

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

export const retryPlatformOutboxEvent = async (
  input: RetryPlatformOutboxEventInput,
  mutationDb: PlatformOutboxMutationDb = getDefaultMutationDb()
): Promise<boolean> => {
  const eventId = input.eventId.trim();

  if (eventId.length === 0) {
    throw new Error("Outbox event retry requires an event id.");
  }

  return await mutationDb.transaction(async (tx) => {
    const retried = await retryOutboxEvent(tx, eventId);

    if (!retried) {
      return false;
    }

    await recordPlatformAuditEvent(tx, {
      action: "outbox.retry_requested",
      actorPlatformAdminId: input.actorPlatformAdminId,
      actorUserId: input.actorUserId,
      metadata: { eventId },
      subjectId: eventId,
      subjectType: "event_outbox",
    });

    return true;
  });
};
