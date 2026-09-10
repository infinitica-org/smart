/**
 * Load: gradually ramp concurrent users through configurable stages,
 * holding each long enough to observe stable behaviour. Default stages
 * (100 -> 200 -> 500 -> 1000 -> 2000) match the task brief; override with
 * LOAD_STAGES="target:duration,..." e.g. "50:1m,150:2m".
 *
 * EXECUTOR_MODE=arrival-rate switches from "N concurrent users" (ramping-vus)
 * to "N requests/iterations per second" (ramping-arrival-rate) — see README
 * "concurrent users vs requests/iterations per second" for when to use which.
 * VUs measure realistic user concurrency; arrival-rate measures raw capacity
 * independent of how long each request takes.
 */
import { sleep } from 'k6';
import { buildThresholds } from '../config/thresholds.js';
import { parseStages } from '../config/stages.js';
import { runMixedIteration } from '../helpers/traffic-mix.js';
import { handleSummaryFor } from '../helpers/summary.js';

export const handleSummary = handleSummaryFor('load');

const EXECUTOR_MODE = __ENV.EXECUTOR_MODE || 'vus';

const VU_STAGES = parseStages(__ENV.LOAD_STAGES, [
  { target: 100, duration: '2m' },
  { target: 200, duration: '2m' },
  { target: 500, duration: '3m' },
  { target: 1000, duration: '3m' },
  { target: 2000, duration: '5m' },
]);

const RATE_STAGES = parseStages(__ENV.LOAD_RATE_STAGES, [
  { target: 100, duration: '2m' },
  { target: 500, duration: '2m' },
  { target: 1000, duration: '3m' },
  { target: 2000, duration: '3m' },
]);

function buildScenario() {
  if (EXECUTOR_MODE === 'arrival-rate') {
    return {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.LOAD_PRE_ALLOCATED_VUS || '200'),
      maxVUs: Number(__ENV.LOAD_MAX_VUS || '4000'),
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
  scenarios: { load: buildScenario() },
  thresholds: buildThresholds(),
};

export default function () {
  runMixedIteration(__VU);
  sleep(1);
}
