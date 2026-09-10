# @smart/load-tests — performance & stress testing

k6-based performance/stress testing for the whole SMART stack: 5 Next.js apps
(web-student, web-tpo, web-admin, web-verify, web-auth), the NestJS `api-core`
backend, PostgreSQL, Redis, and Redpanda (Kafka-protocol). Integrates with the
existing Prometheus/Grafana/Loki/Tempo stack under `infra/observability/`
rather than standing up a parallel one — see ADR-0015
(`docs/adr/0015-perf-testing-observability.md`) for what was reused vs. added.

## 1. Architecture

```
k6 (host CLI, or grafana/k6 Docker image)
      |
      v
 web-student(3001)  web-tpo(3002)  web-admin(3003)  web-verify(3004)  web-auth(3005)
      |                  |               |                |               |
      +------------------+---------------+----------------+---------------+
                                      |
                                      v
                                api-core (3000, /api/v1)
                                 /      |       \
                                v       v        v
                            Redis   Redpanda   Postgres
                          (cache,   (Kafka-    (Prisma,
                        rate-limit, protocol)  pool=20/
                        sessions)              instance)
```

`web-company` (apps/web-company) has no `package.json`/`src/` and is not in
docker-compose — it does not run, so it's excluded from every scenario.
There are **5** active Next.js apps, not 4 — the task brief's assumption
didn't match this repo; adapted rather than forced.

Metrics/traces flow: api-core exposes `/api/v1/admin/metrics` (Prometheus
scrape) and, when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, OTLP traces to Tempo.
k6 pushes its own run metrics to Prometheus via remote-write when Prometheus
is reachable (`scripts/run-k6.sh` detects this automatically).

## 2. Prerequisites

- k6 CLI (`brew install k6` / `choco install k6` / see
  https://k6.io/docs/get-started/installation/), **or** Docker (falls back
  automatically — `pnpm stress:smoke` prints instructions if k6 is missing;
  see `scripts/require-k6.sh`).
- Docker + Docker Compose (already required by the rest of this repo).
- Node 22 + pnpm 11 (already required by this repo).
- For `scenarios/browser-student-flow.js`: a k6 build with the `k6/browser`
  module — the official `grafana/k6` Docker image has it; a plain
  `brew install k6` binary may not on older versions.

## 3. Starting the environment

```bash
pnpm stress:up      # postgres, redis, redpanda, minio, api, all 5 web apps,
                     # prometheus, grafana, loki, alloy, tempo, exporters
pnpm stress:wait     # blocks until every service reports healthy
pnpm stress:seed     # base seed + TEST_DATA_USERS (default 200) load-test accounts
```

`pnpm stress:down` tears the same profiles back down. This never touches
anything outside the `apps`/`obs` compose profiles — your normal
`pnpm infra:up` dev workflow is unaffected.

## 4. Starting Grafana/Prometheus

Already covered by `pnpm stress:up` (the `obs` profile). Standalone:

```bash
pnpm infra:obs
```

## 5-9. Running each profile

```bash
pnpm stress:smoke      # 15 VUs, 3 min — verifies the environment works at all
pnpm stress:baseline   # 100 VUs, 20 min — normal-performance characteristics
pnpm stress:load       # ramps 100 -> 200 -> 500 -> 1000 -> 2000 VUs
pnpm stress:stress     # ramps past that until something breaks (see below)
pnpm stress:spike      # 100 -> sudden 5000 -> hold -> back to 100
pnpm stress:soak       # 1000 VUs for 4h — leaks and slow degradation only
```

Every profile is a normal k6 script under `src/tests/*.js` — running
`k6 run src/tests/load.js` directly (from `tools/load-tests/`) works
identically; `pnpm stress:*` is `scripts/run-k6.sh` plus the Prometheus
remote-write auto-wiring.

`smoke` is the only profile with `abortOnFail: true` thresholds — it is
meant to fail fast and loud. The rest keep running past a threshold breach on
purpose, because `stress`/`spike`/`soak`'s whole point is to observe what
happens _after_ things start going wrong, not to stop the instant they do.

## 10. Running browser tests

```bash
pnpm stress:browser
```

This is the **only** browser-based scenario, and deliberately not part of any
high-volume profile — k6 Browser drives real headless Chromium per VU, far
more resource-intensive than protocol-level HTTP. It covers one realistic
flow (web-auth login -> cross-portal redirect -> web-student dashboard
hydration) and measures page load, navigation, and browser console errors.
The full proctored assessment-taking flow (camera/mic permissions, face
enrollment) is out of scope for headless automation — see the file's header
comment for why.

**Browser vs. protocol-level testing**: every `stress:*` profile above is
protocol-level HTTP (k6's native `http` module) — that's what generates real
concurrent load. k6 Browser is for depth on one flow, never for volume.

## 11. Configuring target URLs

Copy `.env.example` to `.env` (never commit the filled file) and set
`API_URL`/`APP_*_URL`/`AUTH_URL`/`BASE_URL`. Every scenario imports these from
`src/config/index.js` — never hardcoded per-file.

## 12. Configuring users/test data

```bash
TEST_DATA_USERS=1000 pnpm stress:seed
```

Runs `apps/api-core/prisma/seed-load-test.ts` (idempotent — upserts on
email), writing `src/data/users.json` (**emails only, never passwords** — the
shared `TEST_PASSWORD` comes from env at run time, not from the fixture
file). k6 loads that file via `SharedArray` (`src/helpers/data.js`) so it's
parsed once and shared read-only across every VU, not duplicated per-VU —
scaling to `TEST_DATA_USERS=100000` does not scale k6's own memory use with
it. Cache-stampede and Kafka-backpressure scenarios need one distinct account
per concurrent VU — seed at least as many users as the VU count you intend
to run them with.

## 13. Configuring RPS/VUs

- **Concurrent users vs. requests/iterations per second**: a VU-based
  executor (`ramping-vus`, used by default in `load.js`/`stress.js`, always in
  `smoke`/`baseline`/`spike`/`soak`) models _N people using the app
  simultaneously_ — each VU loops through think-time and requests at
  whatever pace the scenario takes. An arrival-rate executor
  (`ramping-arrival-rate`/`constant-arrival-rate`, used by
  `kafka-backpressure.js` always, and by `load.js`/`stress.js` when
  `EXECUTOR_MODE=arrival-rate`) instead targets _N requests per second
  regardless of how many VUs that takes_ — the right model for "what's this
  API's raw request-handling capacity", independent of realistic user
  behaviour. Use VUs to simulate a placement drive; use arrival-rate to find
  a hard capacity ceiling.
- Override any profile's shape without editing a file:
  `LOAD_STAGES="50:1m,150:2m,400:3m"`, `STRESS_STAGES="...`,
  `SPIKE_PEAK_VUS=10000`, `SOAK_VUS=2000 SOAK_DURATION=8h`, etc. — see
  `.env.example` for every variable and each `src/tests/*.js` file's header.

## 14. Viewing Grafana dashboards

```bash
pnpm stress:dashboard   # prints the URLs
```

- **SMART / k6 Load Test** — RPS, error rate, p50/95/99, active VUs, per-name
  RPS, custom category latency. Populated only while a `pnpm stress:*` run
  has Prometheus remote-write enabled (automatic when Prometheus is up).
- **SMART / Platform Overview**, **API Metrics**, **Postgres**, **Redis**,
  **Redpanda (Kafka)**, **Host & Containers** — the app/infra side; see
  `infra/observability/README.md` for full panel-by-panel coverage.

## 15. Interpreting Kafka lag

`smart-redpanda.json`'s "Consumer lag (messages) by topic/group" panel plots
`smart_kafka_consumer_lag_messages` — computed by `api-core`'s `KafkaService`
polling broker high-water marks against each consumer group's committed
offset every 15s (this is new; previously declared but never populated — see
ADR-0015). Rising, non-recovering lag during `kafka-backpressure.js` means
the `evaluation` consumer group is falling behind produce rate — the
`smart.assessment.submitted` topic has 12 partitions
(`packages/contracts/src/events/topics.ts`), so lag concentrated on a few
partitions vs. spread evenly also tells you whether more partitions or more
consumer instances is the right fix.

## 16. Interpreting PostgreSQL saturation

`smart-postgres.json`: connections as % of `max_connections`, cache hit
ratio, deadlocks, commit/rollback rate. Cross-reference with
`CAPACITY_REPORT.md`'s connection-pool math — `PrismaService` hardcodes
`max: 20` per `api-core` instance with no PgBouncer.

## 17. Interpreting Redis saturation

`smart-redis.json`: memory vs. the compose-configured 512 MB `maxmemory`
(`volatile-lru` eviction — `infra/docker/docker-compose.yml`), hit/miss
ratio, evictions, connected clients. The app-level
`smart_cache_operations_total{namespace="items_form"}` hit-ratio panel on
`smart-api-metrics.json` is the more direct signal for
`scenarios/cache-stampede.js` specifically.

## 18. Finding NestJS bottlenecks

`smart-api-metrics.json`'s Node.js panels: event-loop lag, heap ratio, GC
pause p95, active handles/requests. If `OTEL_EXPORTER_OTLP_ENDPOINT` is set,
Tempo shows the actual per-request span breakdown (HTTP handler time vs.
Postgres query time vs. Redis call time vs. Kafka produce time) for any slow
request — see "Correlated observability" below.

## 19. Finding Next.js bottlenecks

Deliberately out of deep scope: every app but `web-verify`'s one server page
is `'use client'`, fetching from `api-core` after hydration — a slow page is
almost always a slow `api-core` call, findable via #18 above, not a Next.js
server-side issue. `smart-host-containers.json`'s per-container CPU/memory
(cAdvisor) still shows if a specific web app's container itself is
resource-starved.

## 20. Troubleshooting

- **"k6: command not found"** — see `scripts/require-k6.sh`'s Docker
  fallback instructions, printed automatically by any `pnpm stress:*`.
- **Every request fails immediately** — check `pnpm stress:wait` passed;
  check `.env`'s `API_URL`/`APP_*_URL` match your actual ports (`.env.example`
  matches this repo's compose defaults).
- **"Traffic mix must sum to 100"** — you overrode some but not all
  `TRAFFIC_*_PCT` vars; they must always sum to 100 (`src/config/index.js`
  throws immediately, per-VU, rather than silently renormalizing).
- **"Refusing to run: ... does not look like a local/CI target"** — see
  "Production safety" below; this is intentional.
- **k6 Prometheus panels empty** — confirm Prometheus is up
  (`curl localhost:9090/-/healthy`) and that `run-k6.sh` printed "enabling
  remote-write output"; if it printed "running with local output only",
  start `pnpm infra:obs` first.
- **`ALLOW_AI_EVAL_LOAD`** — not implemented on purpose; see "Known
  limitations".

## 21. CI usage

`.github/workflows/perf.yml` is `workflow_dispatch`-only by default (pick a
profile from the dropdown) — not on every PR, not on a schedule. `ci.yml`
already documents the self-hosted runner as shared 2 vCPU/8 GB, also running
the live dev stack; an automatic load/stress/spike/soak run would contend
with that. Flip on `pull_request`/`push`/`schedule` triggers deliberately
(commented in the workflow file) once a dedicated runner exists, and keep it
to `smoke` for PRs even then.

## 22. Production safety

- **Every URL is checked** against a local/CI host-hint allowlist
  (`localhost`, `127.0.0.1`, `.local`, `host.docker.internal`) before any VU
  starts; anything else throws immediately unless BOTH
  `ALLOW_PRODUCTION_LOAD_TEST=true` AND `CONFIRM_PRODUCTION_LOAD_TEST=true`
  are set (deliberately two flags, so this can never be one copy-pasted env
  line) — and even then, a loud warning prints before the run starts.
- This suite never deletes data and never changes infrastructure
  configuration — `db:seed:load-test` only upserts rows tagged
  `loadtest.student.*@smart.local`.
- The connection-pool math in `CAPACITY_REPORT.md` is documentation, not an
  automatic change — this suite never touches `max_connections` or
  `PrismaService`'s pool size.

## Traffic mix

Default (all in `.env.example`, all independently overridable, must always
sum to 100):

| Category      | % (env var)                     | Scenario                      |
| ------------- | ------------------------------- | ----------------------------- |
| Browsing      | 50 (`TRAFFIC_BROWSING_PCT`)     | `scenarios/browsing.js`       |
| Search        | 20 (`TRAFFIC_SEARCH_PCT`)       | `scenarios/catalog-search.js` |
| API reads     | 15 (`TRAFFIC_API_READS_PCT`)    | `scenarios/api.js`            |
| Writes        | 8 (`TRAFFIC_WRITES_PCT`)        | `scenarios/writes.js`         |
| Business flow | 7 (`TRAFFIC_BUSINESS_FLOW_PCT`) | `scenarios/business-flow.js`  |

Login isn't a separate bucket — `api.js`/`writes.js`/`business-flow.js` each
log in internally, so `login_latency` is populated without double-counting a
dedicated percentage. See `src/helpers/traffic-mix.js`.

## Custom metrics

`src/helpers/metrics.js`: `frontend_latency`, `api_latency`, `login_latency`,
`search_latency`, `write_latency`, `business_flow_duration` (whole workflow,
in addition to each request inside it), `business_flow_errors`,
`cache_stampede_hits`/`_misses`, `kafka_events_triggered`.

## Thresholds

Separate per category (`src/config/thresholds.js`) — not one global
`http_req_duration`, so a slow write path can't hide behind a healthy
browsing average. Defaults mirror
`packages/contracts/src/http/routes.ts`'s `LATENCY_BUDGET_MS`
(CANDIDATE_CRITICAL=200ms, INTERACTIVE=500ms, REPORTING=1000ms) — a k6
threshold breach and an ARCHITECTURE.md SLA breach mean the same thing.

## Business-critical workflow

The assessment-attempt flow — login, start attempt (Postgres write), a loop
of next-item (Redis cache-aside) + submit-l1 (Redis write-through draft
save), complete (Postgres write, emits Kafka `smart.assessment.submitted`) —
is the platform's core value delivery and the most instrumented scenario
here (`scenarios/business-flow.js`).

## Known limitations

- **L2/L3/L4 evaluation is never load-tested.** `/assessment/compile-l2`,
  `/assessment/evaluate-l3-l4`, `/defense/*`, `/evaluation/skill-interview/*`
  call real Anthropic/Google AI providers billed against
  `AI_MONTHLY_CEILING_USD` (`apps/api-core/src/platform/config/env.ts`).
  `business-flow.js` only ever exercises L1 (MCQ), which is scored
  deterministically server-side, no AI call. `safety.allowAiEvalLoad` exists
  as a documented, inert flag — flipping it does nothing on purpose; a real
  AI-path load test needs its own reviewed scenario and an explicit budget
  conversation, not a config toggle.
- **"Search" is TPO candidate-roster search, not a public catalog
  search** — this repo has exactly one real free-text search endpoint
  (`GET /api/v1/tpo/students?q=`), no public catalog search exists. Using it
  keeps every scenario on real, discovered endpoints instead of inventing one.
- **`postgres-slow.js` tests "unavailable", not "slow".** Genuinely injecting
  latency needs a fault-injection proxy (e.g. Toxiproxy) in front of
  Postgres, which this stack doesn't have — see the file's header for the
  full reasoning.
- **`smart_db_query_duration_seconds`'s `model` label is always `"all"`** —
  Prisma's query event doesn't reliably carry per-model attribution across
  driver adapters (see ADR-0015).
- **A k6-originated trace doesn't include a k6-side span** — k6 doesn't
  propagate W3C `traceparent`, so each traced request's trace root is
  api-core, not the load generator; the fan-out into Postgres/Redis/Kafka
  spans underneath it is what actually answers "why is this slow".
- **Cache-stampede and Kafka-backpressure need seeded concurrency.** Both
  need one distinct account per VU — see "Configuring users/test data".
