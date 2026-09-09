# Local observability (obs profile)

Owner: Vishal V.

## Stack

| Service    | Host port | Purpose                          |
| ---------- | --------- | -------------------------------- |
| Prometheus | 9090      | Metrics scrape                   |
| Grafana    | 3100      | Dashboards (anon auth enabled)   |
| Loki       | 3101      | Log store                        |
| Alloy      | —         | Docker log scrape → Loki         |
| Tempo      | 3103      | Trace store (Grafana datasource) |

```bash
# From repo root — infra + apps + obs
pnpm infra:up
docker compose -f infra/docker/docker-compose.yml --profile apps --profile obs up -d
```

Grafana: http://localhost:3100 (admin / `smart` or anon).

Explore LogQL examples:

```logql
{service="api"} | json | correlationId="<uuid>"
{service="api"} | json | level="error"
```

Dashboard **SMART API logs** is provisioned with a `correlationId` textbox.

## Dashboards

All under the **SMART** folder in Grafana; each links to the others via the
**SMART dashboards** dropdown top-right.

| Dashboard         | Covers                                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform Overview | Cross-cutting: API errors/latency, Postgres/Redis headroom, disk, rate limits, Kafka, top containers — the "what's on fire" landing page                                                                                           |
| API Metrics       | Every real metric in `packages/observability/src/metrics.ts`: HTTP rate/latency/errors, rate limiting, assessment/proctoring domain counters, Kafka events produced, TPO import, Node.js process health (event loop lag, heap, GC) |
| Host & Containers | node-exporter (host CPU/memory/disk/network/load) + cAdvisor (per-container CPU/memory/network/uptime)                                                                                                                             |
| Postgres          | postgres-exporter: connections, cache hit ratio, commit/rollback rate, deadlocks, database size, temp-file spill                                                                                                                   |
| Redis             | redis-exporter: memory vs maxmemory, hit ratio, connected clients, commands/sec, evictions/expirations                                                                                                                             |
| Redpanda (Kafka)  | Native `/public_metrics`: topics/partitions/brokers, per-topic produce/fetch rate, handler latency, per-shard CPU/memory                                                                                                           |
| MinIO             | Cluster capacity used/free, S3 traffic in/out                                                                                                                                                                                      |

**Known gaps, on purpose (not silently missing):**

- `packages/observability/src/metrics.ts` declares several metrics — `smart_ai_*`, `smart_tier_distribution_ratio`, `smart_inter_rater_kappa`, `smart_attempts_completed_total`, `smart_sandbox_executions_total`, `smart_certificates_issued_total`, `smart_verification_lookups_total` — that are never actually `.inc()`/`.observe()`/`.set()` anywhere in `apps/`. No dashboard is built against these; they'd only ever show "No data." ARCHITECTURE.md's "Claude API token consumption" Grafana claim in particular has no metric behind it today. Wiring these up is an `api-core` app-code change, not a dashboards change.
  - `smart_cache_operations_total` (item-bank namespace), `smart_db_query_duration_seconds`, and `smart_kafka_events_consumed_total`/`smart_kafka_consumer_lag_messages` **are now live** — wired as part of `tools/load-tests` (see `tools/load-tests/README.md`) because the stress-test scenarios that exercise them (cache stampede, Kafka backpressure) needed a real signal to assert against. Panels: API Metrics dashboard (cache hit ratio, DB query p95) and Redpanda dashboard (consumer lag).
- `apps/proctoring-cv` exposes no `/metrics` at all (plain stdlib `http.server`, no `prometheus_client`). It's dark to Prometheus entirely — not in any dashboard here.
- **Host & Containers** → "Disk free %" and container mounts reflect the **Docker Desktop Linux VM** on a Windows dev machine, not the Windows host — this is expected locally and will show real numbers once running on the actual Linux VPS (dev/qa/prod).
- `minio_v2/metrics/cluster` only exposes capacity + traffic; per-request/error-rate metrics live on MinIO's node/bucket metrics endpoints, not scraped here to keep this addition scoped.

## Tempo (tracing)

Tempo is up and provisioned as a Grafana datasource (trace-to-logs and
service-map correlation wired to Loki/Prometheus). `api-core` now carries an
**opt-in** OpenTelemetry SDK (`apps/api-core/src/tracing.ts`, HTTP + Fastify +
`pg` + `ioredis` + `kafkajs` auto-instrumentation) that exports to Tempo only
when `OTEL_EXPORTER_OTLP_ENDPOINT` is set — it defaults unset, so a deployment
that doesn't opt in is byte-for-byte unaffected. To see traces:

```bash
# .env (or infra/docker/docker-compose.yml api-env), obs profile must be up
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
```

Each k6-driven HTTP request becomes one trace rooted at api-core (k6 itself
does not propagate W3C `traceparent`, so the trace starts at the API, not at
the load generator) — but that one trace fans out across every Postgres,
Redis and Kafka call the request makes, which is exactly the "why is p99 slow"
question this exists to answer. Pino logs also carry `trace_id`/`span_id`
when a span is active, so Loki ↔ Tempo correlation works both directions.

Next.js apps are **not** instrumented — per the frontend-apps exploration for
`tools/load-tests`, almost all real load lands on api-core after client
hydration, so tracing the Next.js layer would mostly show static-shell
delivery, not the load path this exists to diagnose.

If Tempo fails to start with a permission error writing to `/var/tempo`, add
`user: root` under the `tempo` service in `docker-compose.yml`.

## Notes

- Alloy only sees containers in this Compose project. Host `pnpm dev:api` stdout is not scraped — use the `apps` profile API container, or paste JSON lines into Explore for local debugging.
- API must run with `LOG_PRETTY=false` (Compose default) so Loki receives JSON.
