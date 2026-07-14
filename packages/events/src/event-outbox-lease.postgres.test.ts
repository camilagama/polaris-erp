import { randomUUID } from "node:crypto";
import { db } from "@polaris/db";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { claimOutboxEvent, markOutboxEventProcessed } from "./index";

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
});
