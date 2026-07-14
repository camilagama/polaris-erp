# Dependency Advisory Baseline

Generated: 2026-07-14
Owner: Platform engineering
Review by: 2026-08-14

This baseline records the current `bun audit --json` advisories that are accepted temporarily for the MVP hardening branch. It is not a permanent waiver.

Rules:

- `bun run audit:baseline` must pass in CI.
- New advisory URLs beyond `dependency-advisory-baseline.json` fail the guard.
- Resolved advisories should be removed from the JSON during the next review.
- High advisories must be revisited first when compatible upstream releases exist.

Current posture:

- No runtime-sensitive advisory remains after compatible dependency updates and targeted overrides.
- Remaining advisories are local build/tooling paths: `esbuild` through `drizzle-kit` and low-severity `@babel/core` through Sentry's bundler plugin.
- Public paid launch requires the recorded owner review by 2026-08-14; no high-severity advisory remains in the current audit.
