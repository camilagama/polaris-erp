import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_DIRECT,
});

// All tables expected from schema.ts
const expected = [
  "users",
  "organization",
  "sessions",
  "accounts",
  "verifications",
  "member",
  "invitation",
  "audit_events",
  "platform_admins",
  "platform_admin_grants",
  "platform_audit_events",
  "platform_support_notes",
  "event_outbox",
  "webhook_events",
  "email_messages",
  "email_events",
  "billing_plans",
  "billing_customers",
  "billing_subscriptions",
  "billing_invoices",
  "billing_payment_attempts",
  "billing_provider_links",
  "categories",
  "system_settings",
  "products",
  "product_price_changes",
  "product_stock_entries",
  "product_stock_write_offs",
  "sales",
  "sale_items",
  "goals",
];

const { rows } = await pool.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public'"
);
const existing = new Set(rows.map((r: { tablename: string }) => r.tablename));

const missing = expected.filter((t) => !existing.has(t));
const extra = [...existing].filter((t) => !expected.includes(t));

console.log("Missing tables:", missing.length ? missing.join(", ") : "none");
console.log("Extra tables:", extra.length ? extra.join(", ") : "none");

// Check for missing enums
const { rows: enums } = await pool.query(
  "SELECT typname FROM pg_type WHERE typcategory='E' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') ORDER BY typname"
);
console.log(
  "\nExisting enums:",
  enums.map((e: { typname: string }) => e.typname).join(", ")
);

await pool.end();
