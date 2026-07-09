import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "polaris-erp" });

export const OUTBOX_EVENT_PENDING = "outbox/event.pending";

export const sendOutboxEventToInngest = async (
  outboxEventId: string
): Promise<void> => {
  await inngest.send({
    data: { outboxEventId },
    id: outboxEventId,
    name: OUTBOX_EVENT_PENDING,
  });
};
