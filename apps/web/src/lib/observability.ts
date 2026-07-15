export const getErrorDigest = (error: unknown): string | undefined =>
  error !== null &&
  typeof error === "object" &&
  "digest" in error &&
  typeof (error as { digest?: unknown }).digest === "string"
    ? (error as { digest: string }).digest
    : undefined;

export const createSafeOperationalError = (source: string): Error =>
  new Error(`Operational error reported by ${source}.`);

export const reportTerminalOutboxFailure = ({
  correlationId,
  eventId,
  eventType,
  topic,
}: {
  correlationId: string;
  eventId: string;
  eventType: string;
  topic: string;
}): void => {
  console.error(
    JSON.stringify({
      correlationId,
      event: "outbox.dead_letter",
      eventId,
      eventType,
      topic,
    })
  );
};
