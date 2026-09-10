# Capacity report

Fill this in after a `stress` (and ideally also a `spike` and `soak`) run
against a stack sized like your target deployment. Numbers below are an
**example shape**, not a claim about this repo's actual capacity — nobody has
run these tests against real infrastructure yet.

Sources: the k6 terminal summary (`pnpm stress:stress` prints exactly these
fields), `tools/load-tests/summary-stress.json`, and the Grafana dashboards
(`smart-platform-overview`, `smart-postgres`, `smart-redis`, `smart-redpanda`,
`smart-api-metrics`, `smart-host-containers`) queried at the timestamp where
degradation first appears.

## Maximum sustainable load

```text
RPS:             1,850
Concurrent VUs:  2,100
Error rate:      0.42%
p95:             430ms
p99:             870ms

PostgreSQL CPU:  78%
Redis CPU:       51%
Kafka lag:       <2s
NestJS CPU:      69%

Bottleneck:
PostgreSQL
```

## How to determine the bottleneck

Walk the stages in `stress.js`'s output alongside Grafana, in this order —
whichever one saturates FIRST, at the LOWEST stage, is the bottleneck:

1. **Throughput plateau** — RPS stops climbing while VUs keep climbing
   (`smart-platform-overview` "RPS" panel vs `smart-k6-load-test` "Active VUs").
2. **Postgres** — connections as % of `pg_settings_max_connections`, CPU,
   deadlocks (`smart-postgres.json`). Cross-reference
   `apps/api-core/src/platform/prisma/prisma.service.ts`'s `max: 20` per
   instance — see "Connection-pool math" below.
3. **Redis** — memory vs `maxmemory` (512 MB by default, see
   `infra/docker/docker-compose.yml`), evictions, ops/sec (`smart-redis.json`).
4. **Kafka (Redpanda)** — consumer lag (`smart-redpanda.json` "Consumer lag"
   panel — only populated since this change, see ADR-0015), CPU per shard.
5. **api-core process** — event-loop lag, heap, GC pause p95
   (`smart-api-metrics.json` Node.js panels), container CPU/memory
   (`smart-host-containers.json`, filtered to the `api` container).

## Connection-pool math

```
theoretical max Postgres connections = api-core instances × pool size per instance
                                      = N × 20   (prisma.service.ts hardcodes max: 20)
```

Postgres's own `max_connections` is the base `pgvector/pg16` image default
(no override in `infra/docker/docker-compose.yml` — check
`SHOW max_connections;` in `prisma-studio`/`psql` for your actual value,
commonly 100). With a single `api` instance (the only topology this compose
file runs), 20/100 connections is comfortable headroom. **Scaling to 5+
`api` replicas without adding a pooler (PgBouncer) or lowering `max` per
instance can approach or exceed Postgres's connection ceiling** — this is a
warning to act on before scaling out, not a change this suite makes for you
(see task safety rule: never change production database settings
automatically).

## Record your own result here

```text
Date:
Target (BASE_URL / API_URL):
Profile run:
Stages / duration:

RPS:
Concurrent VUs:
Error rate:
p50 / p95 / p99:

PostgreSQL CPU / connections %:
Redis CPU / memory %:
Kafka consumer lag:
api-core CPU / event-loop lag:

Bottleneck:
Notes:
```
