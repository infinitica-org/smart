/**
 * Stress: continuously increase load until the system reaches its
 * sustainable limit — NOT capped at any assumed number. Default stages go
 * to 5000 but that is a starting point, not a ceiling; override with
 * STRESS_STAGES="target:duration,..." to push further, e.g.
 * "1000:2m,3000:2m,6000:2m,10000:2m".
 *
 * Deliberately does NOT abort on threshold breach (unlike smoke) — the whole
 * point is to keep running past the point of degradation so the report shows
 * WHERE it broke. Read the result together with Grafana:
 *   - error rate / p95 / p99 vs stage — this file's own summary
 *   - throughput plateau — RPS stops climbing while VUs keep climbing
 *   - Postgres saturation — smart-postgres.json (connections % of max, CPU)
 *   - Redis saturation — smart-redis.json (memory, evictions, ops/sec)
 *   - Kafka lag growth — smart-redpanda.json "Consumer lag" panel
 *   - app CPU/memory — smart-api-metrics.json (Node.js process panels) and
 *     smart-host-containers.json (cAdvisor per-container CPU/memory)
 */
import { sleep } from 'k6';
import { buildThresholds } from '../config/thresholds.js';
import { parseStages } from '../config/stages.js';
import { runMixedIteration } from '../helpers/traffic-mix.js';
import { handleSummaryFor } from '../helpers/summary.js';

export const handleSummary = handleSummaryFor('stress');

const EXECUTOR_MODE = __ENV.EXECUTOR_MODE || 'vus';

const VU_STAGES = parseStages(__ENV.STRESS_STAGES, [
  { target: 100, duration: '2m' },
  { target: 500, duration: '2m' },
  { target: 1000, duration: '2m' },
  { target: 2000, duration: '2m' },
  { target: 3000, duration: '2m' },
  { target: 5000, duration: '3m' },
]);

const RATE_STAGES = parseStages(__ENV.STRESS_RATE_STAGES, [
  { target: 200, duration: '2m' },
  { target: 1000, duration: '2m' },
  { target: 2000, duration: '2m' },
  { target: 4000, duration: '2m' },
]);

function buildScenario() {
  if (EXECUTOR_MODE === 'arrival-rate') {
    return {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.STRESS_PRE_ALLOCATED_VUS || '500'),
      maxVUs: Number(__ENV.STRESS_MAX_VUS || '8000'),
      stages: RATE_STAGES,
    };
  }
  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: VU_STAGES,
    gracefulRampDown: '30s',
  };
}

export const options = {
  scenarios: { stress: buildScenario() },
  // No abortOnFail: a stress test's job is to find where it breaks, not to
  // stop the instant it does. Thresholds still PASS/FAIL in the summary.
  thresholds: buildThresholds(),
};

export default function () {
  runMixedIteration(__VU);
  sleep(1);
}
