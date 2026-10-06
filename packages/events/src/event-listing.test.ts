import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { listEventOutbox, listWebhookEvents } from "./index";

vi.mock("server-only", () => ({}));

const DATE_RANGE = {
  from: "2026-01-01",
  timeZone: "America/Sao_Paulo",
  to: "2026-01-07",
};
const CREATED_AT_CAST_PATTERN = /date\(created_at\)/i;
const AVAILABLE_AT_FILTER_PATTERN = /available_at\s*(?:>=|<|<=)/i;

const getExecutedSql = (execute: ReturnType<typeof vi.fn>) =>
  new PgDialect().sqlToQuery(execute.mock.calls[0]?.[0] as SQL);

const expectCreationDateFilter = (execute: ReturnType<typeof vi.fn>) => {
  const query = getExecutedSql(execute);

  expect(query.sql).toContain("created_at >= (");
  expect(query.sql).toContain("created_at < (");
  expect(query.sql.toLowerCase()).toContain("at time zone");
  expect(query.sql).not.toMatch(CREATED_AT_CAST_PATTERN);
  expect(query.sql).not.toMatch(AVAILABLE_AT_FILTER_PATTERN);
  expect(query.params).toContain(DATE_RANGE.from);
  expect(query.params).toContain(DATE_RANGE.to);
  expect(
    query.params.filter((value) => value === DATE_RANGE.timeZone)
  ).toHaveLength(2);
};

describe("event list date ranges", () => {
  it("filters outbox by created_at and still returns the retry availability time", async () => {
    const execute = vi.fn().mockResolvedValue([
      {
        attempts: 1,
        available_at: new Date("2026-01-08T03:00:00.000Z"),
        correlation_id: "correlation-1",
        created_at: new Date("2026-01-07T03:00:00.000Z"),
        event_type: "payment.created",
        id: "outbox-1",
        last_error: null,
        status: "failed",
        topic: "asaas.webhook",
      },
    ]);

    await expect(listEventOutbox({ execute }, DATE_RANGE)).resolves.toEqual([
      {
        attempts: 1,
        availableAt: "2026-01-08T03:00:00.000Z",
        correlationId: "correlation-1",
        createdAt: "2026-01-07T03:00:00.000Z",
        eventType: "payment.created",
        id: "outbox-1",
        lastError: null,
        status: "failed",
        topic: "asaas.webhook",
      },
    ]);
    expectCreationDateFilter(execute);
  });

  it("filters webhooks by their received/created instant", async () => {
    const execute = vi.fn().mockResolvedValue([
      {
        correlation_id: "correlation-2",
        created_at: new Date("2026-01-05T03:00:00.000Z"),
        id: "webhook-1",
        last_error: null,
        provider: "asaas",
        provider_event_id: "provider-event-1",
        status: "processed",
      },
    ]);

    await expect(listWebhookEvents({ execute }, DATE_RANGE)).resolves.toEqual([
      {
        correlationId: "correlation-2",
        id: "webhook-1",
        lastError: null,
        provider: "asaas",
        providerEventId: "provider-event-1",
        receivedAt: "2026-01-05T03:00:00.000Z",
        status: "processed",
      },
    ]);
    expectCreationDateFilter(execute);
  });
});
