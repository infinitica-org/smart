/**
 * Kafka (Redpanda) backpressure test: generate `smart.assessment.submitted`
 * events faster than the `evaluation` consumer group can process them, and
 * watch consumer lag grow.
 *
 * Each attempt completion is exactly one produce to `smart.assessment.submitted`
 * (12 partitions, keyed by attemptId — packages/contracts/src/events/topics.ts).
 * This test skips the item-answering loop entirely (start -> complete
 * immediately) to maximise produce rate per second rather than per-request
 * latency — that is what scenarios/business-flow.js is for.
 *
 * Uses an arrival-rate executor because the thing being controlled here is
 * "events produced per second", not "how many candidates are online" — see
 * README "concurrent users vs requests/iterations per second".
 *
 * Run standalone:
 *   k6 run -e KAFKA_BACKPRESSURE_RATE=50 -e KAFKA_BACKPRESSURE_DURATION=3m \
 *     src/scenarios/kafka-backpressure.js
 *
 * Watch smart_kafka_events_produced_total, smart_kafka_events_consumed_total
 * and (the signal that actually answers "is this backpressure?")
 * smart_kafka_consumer_lag_messages in the Redpanda Grafana dashboard
 * (infra/observability/grafana/dashboards/smart-redpanda.json) while this
 * runs. Requires distinct seeded accounts — see cache-stampede.js's setup note.
 */
import { check, sleep } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { login } from '../helpers/auth.js';
import { authHeaders, timedPost } from '../helpers/http.js';
import { apiLatency, kafkaEventsTriggered } from '../helpers/metrics.js';
import { activeTrackCode, pickUser } from '../helpers/data.js';

const RATE = Number(__ENV.KAFKA_BACKPRESSURE_RATE || '20'); // completions/sec
const DURATION = __ENV.KAFKA_BACKPRESSURE_DURATION || '2m';
const PRE_ALLOCATED_VUS = Math.max(10, RATE * 2);
const MAX_VUS = Math.max(PRE_ALLOCATED_VUS, RATE * 5);

export const options = {
  scenarios: {
    backpressure: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
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
    JSON.stringify({ trackCode: activeTrackCode, levelNumber: 1 }),
    apiLatency,
    'backpressure_start_attempt',
    { headers },
  );
  let attemptId;
  try {
    attemptId = JSON.parse(startRes.body).attemptId;
  } catch {
    return;
  }
  if (!attemptId) return;

  sleep(0.05); // let the attempt row commit before completing it

  const completeRes = timedPost(
    `${urls.api}${API_PREFIX}/assessment/complete`,
    JSON.stringify({ attemptId, autoSubmitted: false }),
    apiLatency,
    'backpressure_complete',
    { headers },
  );
  if (check(completeRes, { 'backpressure: completed': (r) => r.status === 200 })) {
    kafkaEventsTriggered.add(1);
  }
}
