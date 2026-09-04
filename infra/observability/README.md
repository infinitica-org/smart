# Local observability (obs profile)

Owner: Vishal V.

## Stack

| Service    | Host port | Purpose                        |
| ---------- | --------- | ------------------------------ |
| Prometheus | 9090      | Metrics scrape                 |
| Grafana    | 3100      | Dashboards (anon auth enabled) |
| Loki       | 3101      | Log store                      |
| Alloy      | —         | Docker log scrape → Loki       |

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

| Dashboard | Covers |
| --- | --- |
| Platform Overview | Cross-cutting: API errors/latency, Postgres/Redis headroom, disk, rate limits, Kafka, top containers — the "what's on fire" landing page |
| API Metrics | Every real metric in `packages/observability/src/metrics.ts`: HTTP rate/latency/errors, rate limiting, assessment/proctoring domain counters, Kafka events produced, TPO import, Node.js process health (event loop lag, heap, GC) |
| Host & Containers | node-exporter (host CPU/memory/disk/network/load) + cAdvisor (per-container CPU/memory/network/uptime) |
| Postgres | postgres-exporter: connections, cache hit ratio, commit/rollback rate, deadlocks, database size, temp-file spill |
| Redis | redis-exporter: memory vs maxmemory, hit ratio, connected clients, commands/sec, evictions/expirations |
| Redpanda (Kafka) | Native `/public_metrics`: topics/partitions/brokers, per-topic produce/fetch rate, handler latency, per-shard CPU/memory |
| MinIO | Cluster capacity used/free, S3 traffic in/out |

**Known gaps, on purpose (not silently missing):**

- `packages/observability/src/metrics.ts` declares several metrics — `smart_ai_*`, `smart_tier_distribution_ratio`, `smart_inter_rater_kappa`, `smart_attempts_completed_total`, `smart_cache_operations_total`, `smart_db_query_duration_seconds`, `smart_kafka_events_consumed_total`, `smart_kafka_consumer_lag_messages`, `smart_sandbox_executions_total`, `smart_certificates_issued_total`, `smart_verification_lookups_total` — that are never actually `.inc()`/`.observe()`/`.set()` anywhere in `apps/`. No dashboard is built against these; they'd only ever show "No data." ARCHITECTURE.md's "Claude API token consumption" Grafana claim in particular has no metric behind it today. Wiring these up is an `api-core` app-code change, not a dashboards change.
- `apps/proctoring-cv` exposes no `/metrics` at all (plain stdlib `http.server`, no `prometheus_client`). It's dark to Prometheus entirely — not in any dashboard here.
- **Host & Containers** → "Disk free %" and container mounts reflect the **Docker Desktop Linux VM** on a Windows dev machine, not the Windows host — this is expected locally and will show real numbers once running on the actual Linux VPS (dev/qa/prod).
- `minio_v2/metrics/cluster` only exposes capacity + traffic; per-request/error-rate metrics live on MinIO's node/bucket metrics endpoints, not scraped here to keep this addition scoped.

## Notes

- Alloy only sees containers in this Compose project. Host `pnpm dev:api` stdout is not scraped — use the `apps` profile API container, or paste JSON lines into Explore for local debugging.
- API must run with `LOG_PRETTY=false` (Compose default) so Loki receives JSON.
