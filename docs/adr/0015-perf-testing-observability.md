# ADR-0015: Performance-testing suite and OpenTelemetry tracing scope

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Vishal V
- **Ticket:** (perf-testing infrastructure request)

## Context

The stack had no load-testing beyond a single 25-line k6 smoke script
(`tools/load-tests/src/assessment.js`) and no way to answer "why is p99 slow"
across api-core -> Postgres/Redis/Kafka. Separately, another in-flight branch
(`feat/observability-stack-expansion`) already added Prometheus exporters,
per-service Grafana dashboards, and an unwired Tempo config — none of it yet
merged, none of it yet emitting/consuming traces.

## Decision

1. **Extend `tools/load-tests/`, don't create a parallel `performance/` tree.**
   It is already a reserved, committed `@smart/load-tests` workspace package
   with a root `pnpm load` script wired to it.
2. **Reuse the exporter/Tempo commits from `feat/observability-stack-expansion`
   via cherry-pick** (`a74d3fe`, `4e43ec5`) rather than re-implementing the same
   compose services/dashboards/Prometheus scrape config. Its Uptime-Kuma and
   heartbeat commits were deliberately left out — out of scope for
   performance testing.
3. **Add OpenTelemetry to api-core only, fully opt-in.** No OTel existed
   anywhere in the repo. `apps/api-core/src/tracing.ts` is a no-op unless
   `OTEL_EXPORTER_OTLP_ENDPOINT` is set, so every existing deployment is
   byte-for-byte unaffected. Next.js apps are NOT instrumented: per
   `tools/load-tests`'s own frontend exploration, almost all real load lands
   on api-core after client hydration (every web app but web-verify's one
   server-rendered page is `'use client'`, fetching from api-core post-mount)
   — tracing the Next.js layer would mostly show static-shell delivery, not
   the load path this exists to diagnose.
4. **Wire three previously-declared-but-dead Prometheus metrics** —
   `smart_cache_operations_total` (item-bank cache-aside hit/miss),
   `smart_db_query_duration_seconds` (Prisma query event), and
   `smart_kafka_events_consumed_total` / `smart_kafka_consumer_lag_messages`
   (consumer outcome + a periodic admin-API lag poll) — because the
   cache-stampede and Kafka-backpressure scenarios this suite adds have
   nothing real to assert against otherwise (`infra/observability/README.md`
   already documented these as "declared, never called").
5. **k6 -> Prometheus via remote-write**, auto-enabled by
   `tools/load-tests/scripts/run-k6.sh` only when Prometheus is actually
   reachable, so k6 runs work identically with or without the `obs` profile up.
6. **CI stays `workflow_dispatch`-only by default** for anything beyond smoke.
   `ci.yml` already documents the shared self-hosted runner as 2 vCPU/8 GB and
   also running the live dev stack — an automatic multi-hour soak or even a
   PR-triggered load run would contend with that.

## Consequences

- A load/stress/spike/soak run now shows up in the existing Grafana Platform
  Overview / API Metrics / Postgres / Redis / Redpanda dashboards without a
  separate observability stack to maintain.
- Whoever lands `feat/observability-stack-expansion` will see the same
  exporter/Tempo compose changes already present here — expected, mergeable
  overlap, not a conflict to avoid.
- Distributed tracing exists only for api-core's own fan-out
  (HTTP -> Postgres/Redis/Kafka); a trace does not currently start at k6 or
  at a Next.js app, since neither propagates or emits W3C trace context.
- `smart_db_query_duration_seconds`'s `model` label is always `"all"` —
  Prisma's query event doesn't reliably carry per-model attribution across
  driver adapters; per-model breakdown was not worth a larger Prisma Client
  Extension rewrite of `PrismaService` for this change.
