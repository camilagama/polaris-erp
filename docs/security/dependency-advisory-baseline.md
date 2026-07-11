# Dependency Advisory Baseline

Generated: 2026-07-10
Owner: Platform engineering
Review by: 2026-08-10

This baseline records the current `bun audit --json` advisories that are accepted temporarily for the MVP hardening branch. It is not a permanent waiver.

Rules:

- `bun run audit:baseline` must pass in CI.
- New advisory URLs beyond `dependency-advisory-baseline.json` fail the guard.
- Resolved advisories should be removed from the JSON during the next review.
- High advisories must be revisited first when compatible upstream releases exist.

Current posture:

- Runtime-sensitive: `defu`, `fast-uri`, `@opentelemetry/core`.
- Mostly dev/build/test tooling: `vite`, `esbuild`, `postcss`, `brace-expansion`, `@babel/core`.
- Public paid launch still requires either compatible dependency updates or explicit owner sign-off on the remaining runtime-sensitive items.
