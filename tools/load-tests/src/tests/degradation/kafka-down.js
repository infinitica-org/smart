/**
 * Degradation test: Kafka (Redpanda) unavailable. Verifies HTTP requests
 * don't hang indefinitely, since Kafka is not meant to be a synchronous
 * dependency of any request in this API's SLA (ARCHITECTURE.md §3.2 — only
 * L2/L3/L4 evaluation queues are async, and those already return a jobId).
 *
 * OPT-IN AND MANUAL:
 *   docker compose -f infra/docker/docker-compose.yml stop redpanda
 *   k6 run src/tests/degradation/kafka-down.js
 *   docker compose -f infra/docker/docker-compose.yml start redpanda
 *
 * Expected behaviour (apps/api-core/src/platform/kafka/kafka.service.ts
 * `emit()`): a produce failure throws, which `completeAttempt` propagates as
 * an HTTP error — NOT a hang. A response latency close to the Kafka client's
 * own connection-retry/timeout budget (seconds, not the full test duration)
 * is the expected/acceptable outcome here; a request that never returns is
 * the failure this test is watching for. This app's Kafka producer has no
 * request-level circuit breaker today (documented, not silently assumed) —
 * this test is what surfaces whether one is worth adding.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../../config/index.js';
import { login } from '../../helpers/auth.js';
import { authHeaders, timedPost } from '../../helpers/http.js';
import { apiLatency } from '../../helpers/metrics.js';
import { activeTrackCode, pickUser } from '../../helpers/data.js';

const VUS = Number(__ENV.DEGRADATION_VUS || '20');
const DURATION = __ENV.DEGRADATION_DURATION || '2m';
// The signal this test exists to catch: a request that takes anywhere near
// this long has effectively hung, whatever its final status code.
const HANG_THRESHOLD_MS = Number(__ENV.KAFKA_DOWN_HANG_THRESHOLD_MS || '10000');

export const options = {
  scenarios: {
    kafka_down: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds: {
    [`api_latency`]: [`p(99)<${HANG_THRESHOLD_MS}`],
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
    'kafka_down_start_attempt',
    { headers },
  );
  let attemptId;
  try {
    attemptId = JSON.parse(startRes.body).attemptId;
  } catch {
    attemptId = undefined;
  }
  if (attemptId) {
    // complete() emits smart.assessment.submitted — the one Kafka produce on
    // this path. With Redpanda down this should error quickly, not hang.
    timedPost(
      `${urls.api}${API_PREFIX}/assessment/complete`,
      JSON.stringify({ attemptId, autoSubmitted: false }),
      apiLatency,
      'kafka_down_complete',
      { headers },
    );
  }
  sleep(1);
}
