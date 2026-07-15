import "server-only";

import { FREE_PLAN_ID } from "@polaris/billing";
import { type SQL, sql } from "drizzle-orm";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface TransactionalDb {
  transaction: <T>(
    callback: (transaction: QueryableDb) => Promise<T>
  ) => Promise<T>;
}

const toRows = (result: unknown): Record<string, unknown>[] => {
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null
    );
  }

  return [];
};

const toStringValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const downgradeDuePaidSubscriptions = async (
  db: TransactionalDb,
  now = new Date()
): Promise<string[]> =>
  db.transaction(async (transaction) => {
    const rows = toRows(
      await transaction.execute(sql`
        with free_plan as (
          select id
          from billing_plans
          where id = ${FREE_PLAN_ID}
            and status = 'active'
        ),
        due_subscriptions as (
          select subscription.id, subscription.organization_id
          from billing_subscriptions as subscription
          inner join billing_plans as plan on plan.id = subscription.plan_id
          cross join free_plan
          where plan.id <> ${FREE_PLAN_ID}
            and (
              (
                subscription.status = 'past_due'
                and subscription.grace_period_ends_at is not null
                and subscription.grace_period_ends_at <= ${now}
              )
              or (
                subscription.status = 'active'
                and subscription.cancel_at_period_end = true
                and subscription.current_period_end is not null
                and subscription.current_period_end <= ${now}
              )
            )
          order by subscription.grace_period_ends_at asc nulls last,
                   subscription.current_period_end asc nulls last,
                   subscription.id asc
          for update of subscription skip locked
        ),
        downgraded_subscriptions as (
          update billing_subscriptions as subscription
          set status = 'canceled',
              canceled_at = coalesce(subscription.canceled_at, ${now}),
              grace_period_ends_at = null,
              updated_at = now()
          from due_subscriptions as due
          where subscription.id = due.id
          returning subscription.id as previous_subscription_id,
                    subscription.organization_id
        ),
        free_subscriptions as (
          insert into billing_subscriptions (
            organization_id,
            plan_id,
            status,
            current_period_start,
            cancel_at_period_end
          )
          select
            downgraded.organization_id,
            free_plan.id,
            'active',
            ${now},
            false
          from downgraded_subscriptions as downgraded
          cross join free_plan
          returning id, organization_id
        ),
        audited_downgrades as (
          insert into audit_events (
            organization_id,
            actor_user_id,
            type,
            subject_type,
            subject_id,
            metadata
          )
          select
            free_subscription.organization_id,
            null,
            'billing.subscription.downgraded_to_free',
            'billing_subscription',
            downgraded.previous_subscription_id::text,
            jsonb_build_object(
              'freeSubscriptionId', free_subscription.id,
              'transitionedAt', ${now.toISOString()}
            )
          from downgraded_subscriptions as downgraded
          inner join free_subscriptions as free_subscription
            on free_subscription.organization_id = downgraded.organization_id
        )
        select organization_id
        from free_subscriptions
      `)
    );

    return rows
      .map((row) => toStringValue(row.organization_id))
      .filter((organizationId) => organizationId.length > 0);
  });
