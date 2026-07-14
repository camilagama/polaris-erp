import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "polaris-erp" });

export const OUTBOX_EVENT_PENDING = "outbox/event.pending";
