import { db } from "@/db";
import {
  claimOutboxEvent,
  markOutboxEventFailed,
  markOutboxEventProcessed,
  type QueryableDb,
} from "@/lib/event-foundation";
import { inngest, OUTBOX_EVENT_PENDING } from "@/lib/inngest-client";

type OutboxDispatcher = (
  event: NonNullable<Awaited<ReturnType<typeof claimOutboxEvent>>>
) => Promise<void>;

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
    await markOutboxEventFailed({
      db: database,
      error: `No outbox dispatcher registered for ${event.topic}:${event.eventType}.`,
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
