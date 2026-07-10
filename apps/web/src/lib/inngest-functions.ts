import { db } from "@polaris/db";
import {
  claimOutboxEvent,
  markOutboxEventFailed,
  markOutboxEventProcessed,
  type QueryableDb,
} from "@polaris/events";
import { inngest, OUTBOX_EVENT_PENDING } from "@/lib/inngest-client";

type OutboxDispatcher = (
  event: NonNullable<Awaited<ReturnType<typeof claimOutboxEvent>>>
) => Promise<void>;

export const CAPTURE_ONLY_OUTBOX_TOPICS = [
  "asaas.webhook",
  "resend.webhook",
  "woovi.webhook",
] as const;

const captureOnlyOutboxTopics = new Set<string>(CAPTURE_ONLY_OUTBOX_TOPICS);
const outboxDispatchers = new Map<string, OutboxDispatcher>();

const getDispatcherKey = (topic: string, eventType: string): string =>
  `${topic}:${eventType}`;

export const registerOutboxDispatcher = ({
  dispatcher,
  eventType,
  topic,
}: {
  dispatcher: OutboxDispatcher;
  eventType: string;
  topic: string;
}): void => {
  outboxDispatchers.set(getDispatcherKey(topic, eventType), dispatcher);
};

export const processOutboxEvent = async (
  database: QueryableDb,
  outboxEventId: string
): Promise<"failed" | "processed" | "skipped"> => {
  const event = await claimOutboxEvent(database, outboxEventId);

  if (!event) {
    return "skipped";
  }

  const dispatcher = outboxDispatchers.get(
    getDispatcherKey(event.topic, event.eventType)
  );

  if (!dispatcher) {
    const error = captureOnlyOutboxTopics.has(event.topic)
      ? `Outbox topic ${event.topic} is capture-only and is not dispatched.`
      : `No outbox dispatcher registered for ${event.topic}:${event.eventType}.`;

    await markOutboxEventFailed({
      db: database,
      error,
      eventId: event.id,
    });

    return "failed";
  }

  try {
    await dispatcher(event);
    await markOutboxEventProcessed(database, event.id);

    return "processed";
  } catch (error) {
    await markOutboxEventFailed({
      db: database,
      error: error instanceof Error ? error.message : "Unknown outbox error.",
      eventId: event.id,
    });

    throw error;
  }
};

const processOutboxEventFunction = inngest.createFunction(
  {
    id: "process-outbox-event",
    name: "Process outbox event",
    triggers: [{ event: OUTBOX_EVENT_PENDING }],
  },
  async ({ event, step }) => {
    const outboxEventId = event.data.outboxEventId;

    if (typeof outboxEventId !== "string" || outboxEventId.length === 0) {
      return { status: "skipped" as const };
    }

    const status = await step.run("process-outbox-event", () =>
      processOutboxEvent(db, outboxEventId)
    );

    return { status };
  }
);

export const inngestFunctions = [processOutboxEventFunction];
