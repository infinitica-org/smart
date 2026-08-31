# ADR-0010: Structured server logging (pino + ALS + Loki)

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Tino + Vishal V
- **Ticket:** [#73](https://github.com/infinitica-org/smart/issues/73)

## Context

`@smart/observability` already defined JSON pino, redaction, and AsyncLocalStorage correlation, but `api-core` booted a bare `nestjs-pino` without that contract. Logs lacked consistent fields, forged `x-correlation-id` values could appear as `traceId`, and Loki in the Compose `obs` profile had nothing to scrape.

## Decision

1. **One logger stack:** pino via nestjs-pino, configured only through `buildPinoHttpOptions` / `buildPinoBaseOptions` from `@smart/observability`. No second logging library (Winston, Bunyan, Datadog agent SDK, etc.) in V1.
2. **Correlation key:** `correlationId` (UUID). HTTP error bodies keep `traceId` as an alias of the same value. Inbound `x-correlation-id` is accepted only if it is a UUID; otherwise mint one.
3. **Context:** AsyncLocalStorage (`runWithContext`). HTTP interceptor stamps ALS + `request.smartLogContext`. Kafka produce attaches `correlation-id` header; consumers use `runKafkaHandler`.
4. **Redaction:** central `REDACTED_PATHS` — credentials, assessment content, PII. Do not log answers, transcripts, JWTs, or emails.
5. **Ship path:** JSON stdout → Grafana Alloy (Docker logs) → Loki → Grafana. Pretty-print is a local transport only (`LOG_PRETTY`).
6. **Event catalog:** `LOG_EVENTS` + `logEvent()` — named events for dashboards and grep.
7. **Deferred:** OpenTelemetry distributed traces, Datadog, Sentry (named in ARCHITECTURE §16 but not in the running V1 stack).

## Consequences

- New Nest modules must not invent ad-hoc log shapes; use `logEvent` / Nest Logger with catalogued events.
- ESLint `no-console` is an error (bootstrap `console.error` in `main.ts` only).
- Changing redaction paths or required log fields is an observability package change with tests.
- Loki queries use `{service="api"} | json | correlationId="…"`.
