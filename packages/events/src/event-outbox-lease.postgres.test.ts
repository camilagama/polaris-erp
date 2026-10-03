import { randomUUID } from "node:crypto";
import { db } from "@polaris/db";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  claimOutboxEvent,
  listEventOutbox,
  listWebhookEvents,
  markOutboxEventProcessed,
} from "./index";

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.POSTGRES_BEHAVIOR_DATABASE_URL;
const behaviorDescribe = databaseUrl ? describe : describe.skip;

behaviorDescribe("event outbox leases", () => {
  const eventId = randomUUID();
  const idempotencyKey = `event-outbox-lease:${eventId}`;

  beforeAll(() => {
    process.env.DATABASE_URL = databaseUrl;
  });

  afterAll(async () => {
    await db.execute(sql`delete from event_outbox where id = ${eventId}`);
  });

  it("reclaims an expired lease and rejects completion by the former owner", async () => {
    await db.execute(sql`
      insert into event_outbox (
        id,
        topic,
        event_type,
        correlation_id,
        idempotency_key,
        payload,
        status,
        available_at
      )
      values (
        ${eventId},
        'behavior-test',
        'lease-recovery',
        'behavior-test',
        ${idempotencyKey},
        '{}'::jsonb,
        'pending',
        now()
      )
    `);

    const firstClaim = await claimOutboxEvent(db, eventId);

    expect(firstClaim?.claimToken).toEqual(expect.any(String));

    await db.execute(sql`
      update event_outbox
      set lease_expires_at = now() - interval '1 second'
      where id = ${eventId}
    `);

    const reclaimed = await claimOutboxEvent(db, eventId);

    expect(reclaimed?.claimToken).toEqual(expect.any(String));
    expect(reclaimed?.claimToken).not.toBe(firstClaim?.claimToken);
    await expect(
      markOutboxEventProcessed(db, eventId, firstClaim?.claimToken ?? "")
    ).resolves.toBe(false);
    await expect(
      markOutboxEventProcessed(db, eventId, reclaimed?.claimToken ?? "")
    ).resolves.toBe(true);
  });

  it("allows only one worker to claim a pending outbox event", async () => {
    const concurrentEventId = randomUUID();

    try {
      await db.execute(sql`
        insert into event_outbox (
          id,
          topic,
          event_type,
          correlation_id,
          idempotency_key,
          payload,
          status,
          available_at
        )
        values (
          ${concurrentEventId},
          'behavior-test',
          'concurrent-claim',
          'behavior-test',
          ${`event-outbox-concurrent:${concurrentEventId}`},
          '{}'::jsonb,
          'pending',
          now()
        )
      `);

      const claims = await Promise.all([
        claimOutboxEvent(db, concurrentEventId),
        claimOutboxEvent(db, concurrentEventId),
      ]);

      expect(claims.filter(Boolean)).toHaveLength(1);
    } finally {
      await db.execute(
        sql`delete from event_outbox where id = ${concurrentEventId}`
      );
    }
  });

  it("filters event creation dates with inclusive Sao Paulo days", async () => {
    const fixtures = [
      { createdAt: "start", id: randomUUID(), key: "start" },
      { createdAt: "before-start", id: randomUUID(), key: "before-start" },
      {
        createdAt: "end-minus-one-microsecond",
        id: randomUUID(),
        key: "end-inside",
      },
      { createdAt: "end", id: randomUUID(), key: "end" },
    ] as const;
    const start = sql`('2099-01-01'::date::timestamp at time zone 'America/Sao_Paulo')`;
    const end = sql`('2099-01-08'::date::timestamp at time zone 'America/Sao_Paulo')`;
    const createdAtExpression = {
      start,
      "before-start": sql`(${start} - interval '1 microsecond')`,
      "end-minus-one-microsecond": sql`(${end} - interval '1 microsecond')`,
      end,
    };
    const availableAtExpression = {
      start: sql`('2099-01-20'::date::timestamp at time zone 'America/Sao_Paulo')`,
      "before-start": sql`('2099-01-03'::date::timestamp at time zone 'America/Sao_Paulo')`,
      "end-minus-one-microsecond": sql`('2099-01-21'::date::timestamp at time zone 'America/Sao_Paulo')`,
      end: sql`('2099-01-04'::date::timestamp at time zone 'America/Sao_Paulo')`,
    };
    const dateRange = {
      from: "2099-01-01",
      timeZone: "America/Sao_Paulo",
      to: "2099-01-07",
    };

    await db.transaction(async (tx) => {
      for (const fixture of fixtures) {
        await tx.execute(sql`
          insert into event_outbox (
            id,
            topic,
            event_type,
            correlation_id,
            idempotency_key,
            payload,
            status,
            available_at,
            created_at
          ) values (
            ${fixture.id},
            'behavior-test',
            'event-listing',
            ${fixture.key},
            ${`event-listing:${fixture.key}:${fixture.id}`},
            '{}'::jsonb,
            'pending',
            ${availableAtExpression[fixture.createdAt]},
            ${createdAtExpression[fixture.createdAt]}
          )
        `);
        await tx.execute(sql`
          insert into webhook_events (
            id,
            provider,
            provider_event_id,
            idempotency_key,
            correlation_id,
            raw_body_sha256,
            created_at
          ) values (
            ${fixture.id},
            'behavior-test',
            ${`event-listing:${fixture.key}:${fixture.id}`},
            ${`webhook-listing:${fixture.key}:${fixture.id}`},
            ${fixture.key},
            repeat('a', 64),
            ${createdAtExpression[fixture.createdAt]}
          )
        `);
      }

      await tx.execute(sql`set local time zone 'UTC'`);
      const utcOutbox = await listEventOutbox(tx, dateRange);
      const utcWebhooks = await listWebhookEvents(tx, dateRange);

      await tx.execute(sql`set local time zone 'America/Sao_Paulo'`);
      const saoPauloOutbox = await listEventOutbox(tx, dateRange);
      const saoPauloWebhooks = await listWebhookEvents(tx, dateRange);

      const includedIds = [fixtures[0].id, fixtures[2].id].sort();
      const utcOutboxIds = utcOutbox
        .filter(({ id }) => fixtures.some((fixture) => fixture.id === id))
        .map(({ id }) => id)
        .sort();
      const utcWebhookIds = utcWebhooks
        .filter(({ id }) => fixtures.some((fixture) => fixture.id === id))
        .map(({ id }) => id)
        .sort();

      expect(utcOutboxIds).toEqual(includedIds);
      expect(utcWebhookIds).toEqual(includedIds);
      expect(
        saoPauloOutbox
          .filter(({ id }) => fixtures.some((fixture) => fixture.id === id))
          .map(({ id }) => id)
          .sort()
      ).toEqual(includedIds);
      expect(
        saoPauloWebhooks
          .filter(({ id }) => fixtures.some((fixture) => fixture.id === id))
          .map(({ id }) => id)
          .sort()
      ).toEqual(includedIds);
      expect(
        utcOutbox.find(({ id }) => id === fixtures[0].id)?.availableAt
      ).toContain("2099-01-20");

      for (const fixture of fixtures) {
        await tx.execute(
          sql`delete from event_outbox where id = ${fixture.id}`
        );
        await tx.execute(
          sql`delete from webhook_events where id = ${fixture.id}`
        );
      }
    });
  });
});
