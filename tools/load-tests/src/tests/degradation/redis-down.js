/**
 * Degradation test: Redis unavailable. Verifies the system does not cause a
 * Postgres stampede when its cache layer disappears.
 *
 * OPT-IN AND MANUAL — this file does not stop any container itself (k6 has
 * no Docker access, by design). Run it as:
 *
 *   docker compose -f infra/docker/docker-compose.yml stop redis
 *   k6 run -e API_URL=http://localhost:3000 src/tests/degradation/redis-down.js
 *   docker compose -f infra/docker/docker-compose.yml start redis
 *
 * Expected behaviour (from apps/api-core/src/modules/rate-limit/rate-limit.service.ts
 * and assessment.service.ts's `getNextItem`): rate limiting fails OPEN outside
 * production (`failOpenOnRedisError`) rather than 500ing every request, and
 * the item-bank cache-aside falls through to Postgres on a Redis error. That
 * fallback is exactly the stampede risk this test measures: watch Postgres
 * CPU/connections (smart-postgres.json) during this run — a healthy fallback
 * means slower responses, not a saturated database.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../../config/index.js';
import { login } from '../../helpers/auth.js';
import { authHeaders, timedGet, timedPost } from '../../helpers/http.js';
import { apiLatency } from '../../helpers/metrics.js';
import { activeTrackCode, pickUser } from '../../helpers/data.js';

const VUS = Number(__ENV.DEGRADATION_VUS || '30');
const DURATION = __ENV.DEGRADATION_DURATION || '2m';

export const options = {
  scenarios: {
    redis_down: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds: {
    // Deliberately loose: the point of this test is to OBSERVE degraded
    // behaviour, not to assert a strict SLA against a dependency we just
    // took down on purpose. http_req_failed still catches a hard crash.
    http_req_failed: ['rate<0.5'],
  },
};

export default function () {
  const user = pickUser(__VU);
  const session = login(user.email, user.password);
  if (!session) return;
  const headers = authHeaders(session.accessToken);

  const startRes = timedPost(
    `${urls.api}${API_PREFIX}/assessment/start`,
    JSON.stringify({ trackCode: activeTrackCode, levelNumber: 1 }),
    apiLatency,
    'redis_down_start_attempt',
    { headers },
  );
  let attemptId;
  try {
    attemptId = JSON.parse(startRes.body).attemptId;
  } catch {
    attemptId = undefined;
  }
  if (attemptId) {
    timedGet(
      `${urls.api}${API_PREFIX}/assessment/${attemptId}/next-item`,
      apiLatency,
      'redis_down_next_item',
      { headers },
    );
  }
  sleep(1);
}
