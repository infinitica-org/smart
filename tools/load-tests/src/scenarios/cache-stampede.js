/**
 * Redis cache-stampede test for the item-bank warm cache
 * (`items:form:{trackCode}:{levelNumber}:{formId}`, see
 * apps/api-core/src/modules/assessment/assessment.service.ts `getNextItem`).
 *
 * That cache-aside read has no request-coalescing/lock around the
 * DB-populate-then-cache step — this test exists to measure exactly how bad
 * that gets under concurrency:
 *
 *   ideal:    N requests -> 1 Postgres query  -> Redis -> (N-1) cache hits
 *   observed: N requests -> up to N Postgres queries (a true stampede)
 *
 * Run standalone so every VU's single iteration starts at (approximately) the
 * same instant — `per-vu-iterations` with `iterations: 1` guarantees that,
 * unlike a shared-iterations pool where VUs start staggered:
 *
 *   k6 run src/scenarios/cache-stampede.js
 *
 * Requires distinct seeded accounts — one per VU — so each VU starts its OWN
 * attempt rather than resuming a shared one (which would serialize instead of
 * racing). Run `pnpm --filter @smart/api-core db:seed:load-test` first with
 * TEST_DATA_USERS >= the VU count below. For a genuinely COLD cache (the
 * scenario this is meant to catch — many candidates starting a scheduled exam
 * at the same instant), pick a level that has never been served this run, or
 * flush Redis first (`docker compose ... exec redis redis-cli FLUSHDB`,
 * local/dev only — never on a shared or production Redis).
 *
 * Watch smart_cache_operations_total{namespace="items_form"} (hit vs miss) and
 * smart_db_query_duration_seconds_count in the API Metrics Grafana dashboard
 * while this runs — see infra/observability/grafana/dashboards/smart-api-metrics.json.
 */
import { check } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { login } from '../helpers/auth.js';
import { authHeaders, timedGet, timedPost } from '../helpers/http.js';
import { apiLatency, cacheStampedeHits, cacheStampedeMisses } from '../helpers/metrics.js';
import { activeTrackCode, pickUser } from '../helpers/data.js';

const STAMPEDE_VUS = Number(__ENV.STAMPEDE_VUS || '50');
const STAMPEDE_LEVEL = Number(__ENV.STAMPEDE_LEVEL_NUMBER || '1');

export const options = {
  scenarios: {
    stampede: {
      executor: 'per-vu-iterations',
      vus: STAMPEDE_VUS,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const user = pickUser(__VU);
  const session = login(user.email, user.password);
  if (!session) return;
  const headers = authHeaders(session.accessToken);

  const startRes = timedPost(
    `${urls.api}${API_PREFIX}/assessment/start`,
    JSON.stringify({ trackCode: activeTrackCode, levelNumber: STAMPEDE_LEVEL }),
    apiLatency,
    'stampede_start_attempt',
    { headers },
  );
  let attemptId;
  try {
    attemptId = JSON.parse(startRes.body).attemptId;
  } catch {
    return;
  }
  if (!attemptId) return;

  // No think-time here on purpose — every VU races straight for the same
  // item-bank key the moment its attempt exists.
  const itemRes = timedGet(
    `${urls.api}${API_PREFIX}/assessment/${attemptId}/next-item`,
    apiLatency,
    'stampede_next_item',
    { headers },
  );
  const gotItem = check(itemRes, { 'stampede: item served': (r) => r.status === 200 });

  // This test cannot see the app's own smart_cache_operations_total counter
  // directly (that requires reading Prometheus, not this response) — these
  // Counters are a same-run, k6-side proxy: `x-response-time` alone can't
  // distinguish hit/miss, so treat these as "requests completed", and read
  // the actual hit/miss split from Grafana (cache hit ratio panel) during
  // and after the run, per the file header.
  if (gotItem) cacheStampedeHits.add(1);
  else cacheStampedeMisses.add(1);
}
