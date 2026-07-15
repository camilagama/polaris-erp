INSERT INTO "billing_plans" (
	"id",
	"name",
	"status",
	"interval",
	"currency",
	"amount_cents",
	"entitlements"
)
VALUES
	(
		'polaris-free',
		'Polaris Free',
		'active',
		'month',
		'BRL',
		0,
		'[{"key":"catalog.products.limit","value":50},{"key":"goals.active.limit","value":1},{"key":"product.images.limit","value":1}]'::jsonb
	),
	(
		'polaris-paid-monthly',
		'Polaris Mensal',
		'active',
		'month',
		'BRL',
		4990,
		'[{"key":"catalog.products.limit","value":250},{"key":"goals.active.limit","value":3},{"key":"product.images.limit","value":5}]'::jsonb
	)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"status" = EXCLUDED."status",
	"interval" = EXCLUDED."interval",
	"currency" = EXCLUDED."currency",
	"amount_cents" = EXCLUDED."amount_cents",
	"entitlements" = EXCLUDED."entitlements",
	"updated_at" = now();--> statement-breakpoint

UPDATE "billing_subscriptions"
SET
	"plan_id" = CASE
		WHEN "status" IN ('trialing', 'active', 'past_due', 'paused') THEN 'polaris-paid-monthly'
		ELSE 'polaris-free'
	END,
	"status" = CASE
		WHEN "status" IN ('incomplete', 'canceled') THEN 'active'
		ELSE "status"
	END,
	"updated_at" = now()
WHERE "plan_id" = 'polaris-start-monthly';--> statement-breakpoint

UPDATE "billing_plans"
SET
	"status" = 'archived',
	"updated_at" = now()
WHERE "id" = 'polaris-start-monthly';
