# Database package rules

- Use `db:generate`, review and version the SQL, then `db:migrate` for every remote or persistent database, including disposable Neon branches. This is the path replayed by CI.
- Use `db:push` only through the package command with `DATABASE_URL_PUSH_LOCAL` targeting the local scratch database `polaris_push_scratch`. Its guard accepts only `localhost`, `127.0.0.1`, or `::1`, and rejects a target matching `DATABASE_URL` or `DATABASE_URL_DIRECT`.
- Before `db:push`, verify the local PostgreSQL instance and scratch database are throwaway. The URL guard proves loopback and database identity; it cannot prove the server lifecycle or detect a local tunnel to a remote server.
- Keep `DATABASE_URL_DIRECT` for versioned migrations. Do not add an environment switch that permits remote `db:push`, and do not invoke `drizzle-kit push` directly to bypass the supported command.
- After a scratch `db:push` experiment, discard and recreate that database before checking a generated migration from an empty schema. Do not edit or fabricate Drizzle migration-journal entries to reconcile a pushed schema.
- Keep connection strings and credentials out of logs, test output, documentation, and review material.
