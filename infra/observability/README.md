# Local observability (obs profile)

Owner: Vishal V.

## Stack

| Service     | Host port     | Purpose                                    |
| ----------- | ------------- | ------------------------------------------- |
| Prometheus  | 9090          | Metrics scrape                             |
| Grafana     | 3100          | Dashboards (anon auth enabled)             |
| Loki        | 3101          | Log store                                  |
| Alloy       | —             | Docker log scrape → Loki                   |
| Tempo       | 3103          | Trace store (Grafana datasource)           |
| Uptime Kuma | 3102          | Internal uptime monitoring + status page   |
| heartbeat   | —             | Outbound-only, pings Healthchecks.io       |

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

## Tempo (tracing)

Tempo is up and provisioned as a Grafana datasource (with trace-to-logs and
service-map correlation already wired to Loki/Prometheus), but **nothing
emits traces to it yet** — this is infra only. `api-core` needs an OTel SDK
added, exporting to `http://tempo:4318` (OTLP/HTTP) or `http://tempo:4317`
(OTLP/gRPC), before Explore → Tempo shows anything. That's a follow-up, not
part of this change.

If Tempo fails to start with a permission error writing to `/var/tempo`, add
`user: root` under the `tempo` service in `docker-compose.yml`.

## Uptime Kuma (internal uptime + status page)

First boot has no monitors — create an admin account at
http://localhost:3102, then add monitors for whatever matters (API `/health`,
each web app, Postgres/Redis TCP checks, etc.) and, if you want it, a public
status page from the Kuma UI.

Kuma runs on the same host as everything else it watches — it cannot detect
"the whole VPS is unreachable", only "the thing it's watching is down while
Kuma itself is still up". That gap is what `heartbeat` (below) covers.

### Provisioning monitors from code

Uptime Kuma has no REST write API (only Socket.IO, which is what its own
web UI speaks) — so monitors are defined as data in
[`uptime-kuma/monitors.json`](uptime-kuma/monitors.json) and applied by
[`uptime-kuma/provision.py`](uptime-kuma/provision.py), using the
[uptime-kuma-api](https://github.com/lucasheld/uptime-kuma-api) Python
client. It's idempotent — matches existing monitors by `name` and updates
them, so re-running it after editing `monitors.json` is the normal workflow
for adding/changing monitors (no manual UI clicking required). On a
never-configured Kuma instance it also creates the initial admin account
from `KUMA_ADMIN_USERNAME` / `KUMA_ADMIN_PASSWORD`.

It runs in a throwaway `python:3.12-slim` container (the `kuma-provision`
compose service, on its own `obs-tools` profile so a routine
`--profile obs up -d` never touches it) rather than assuming Python is
installed on the host:

```bash
pnpm kuma:provision
```

**Wired into CD**: `scripts/deploy-vps.sh` runs this automatically after
every **qa** and **prod** deploy, once the stack is up and healthy — editing
`monitors.json` and merging is enough to reconcile monitors on the next
deploy, no manual step on the VPS. **dev (kvm2) does not run the `obs`
profile at all** (resource-constrained, apps + Caddy only), so it has no
Kuma instance and this step is skipped there. `qa`/`prod`'s own `.env.qa` /
`.env.prod` on the VPS need a real `KUMA_ADMIN_PASSWORD` set before the
first deploy (not the `CHANGE_ME` placeholder) — deploy-vps.sh doesn't
generate one for you.

Compatibility note: the client library is tested against Kuma
1.21.3–1.23.2; this compose file pins Kuma 1.23.16. That's worked fine in
practice, but if `provision.py` starts erroring after a Kuma image bump,
check the library's compatibility table before assuming the script is at
fault.

To add a monitor: add an entry to `monitors.json` (see the existing ones for
the shape per Kuma monitor type — `http`, `postgres`, `redis`, `port`, etc.)
and re-run (`pnpm kuma:provision`, or it'll pick it up on the next qa/prod
deploy). String values may reference `${SOME_ENV_VAR}`, substituted from the
environment before anything is sent to Kuma, so real credentials (e.g. the
Postgres monitor's connection string) never need to live in this committed
file.

## heartbeat (external dead-man's switch)

`heartbeat` is the one piece here designed to work even when the rest of the
stack is completely dark. It runs a small loop (`infra/docker/heartbeat.sh`)
that checks `HEARTBEAT_CHECK_URL` (defaults to the `api` container's
`/health`) every `HEARTBEAT_INTERVAL_SECONDS` and reports the result to
[Healthchecks.io](https://healthchecks.io) (free, deliberately **not**
self-hosted — the whole point is that it lives outside this infra):

- health check passes → pings `$HEALTHCHECKS_PING_URL` (success)
- health check fails → pings `$HEALTHCHECKS_PING_URL/fail` (immediate alert)
- box/network/Docker daemon is dead → no ping reaches Healthchecks.io at all,
  and *its* grace-period timeout fires the alert instead

Setup:

1. Create a check at healthchecks.io, set its **grace period** comfortably
   above `HEARTBEAT_INTERVAL_SECONDS` (default 60s → e.g. 5 min grace) so one
   slow response doesn't page anyone.
2. Copy its ping URL into `HEALTHCHECKS_PING_URL` in the environment's `.env*`
   file (local/dev/qa/prod each want their own check, so a dev outage doesn't
   look like a prod outage).
3. Point Healthchecks.io's integration at a channel that isn't hosted on this
   VPS (email, Slack, Telegram) — an alert that only reaches a service
   running on the dead box defeats the purpose.

Leaving `HEALTHCHECKS_PING_URL` unset makes the container idle (it logs once
and sleeps) instead of erroring, so it's safe to bring up the `obs` profile
before you've created a check.
