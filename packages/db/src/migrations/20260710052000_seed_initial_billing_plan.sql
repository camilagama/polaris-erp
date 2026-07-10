INSERT INTO billing_plans (
  id,
  name,
  status,
  interval,
  currency,
  amount_cents,
  entitlements
)
VALUES (
  'polaris-start-monthly',
  'Polaris Start',
  'active',
  'month',
  'BRL',
  9900,
  '[{"key":"catalog.products.limit","value":500},{"key":"support.priority","value":false}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  interval = EXCLUDED.interval,
  currency = EXCLUDED.currency,
  amount_cents = EXCLUDED.amount_cents,
  entitlements = EXCLUDED.entitlements,
  updated_at = now();
