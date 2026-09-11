/**
 * Soak: sustained traffic for hours, not minutes — default 1000 VUs / 4h,
 * both configurable. Purpose is exclusively things that only show up over
 * time: memory leaks, event-loop degradation, connection leaks, Kafka
 * consumer lag creeping up, Redis memory growth, Postgres connection
 * exhaustion, gradual latency drift. Watch Grafana over the run, don't just
 * read the final summary — a leak looks fine for the first 30 minutes by
 * definition.
 */
import { sleep } from 'k6';
import { buildThresholds } from '../config/thresholds.js';
import { runMixedIteration } from '../helpers/traffic-mix.js';
import { handleSummaryFor } from '../helpers/summary.js';

export const handleSummary = handleSummaryFor('soak');

const VUS = Number(__ENV.SOAK_VUS || '1000');
const DURATION = __ENV.SOAK_DURATION || '4h';
const RAMP_UP = __ENV.SOAK_RAMP_UP || '5m';
const RAMP_DOWN = __ENV.SOAK_RAMP_DOWN || '2m';

export const options = {
  scenarios: {
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { target: VUS, duration: RAMP_UP },
        { target: VUS, duration: DURATION },
        { target: 0, duration: RAMP_DOWN },
      ],
      gracefulRampDown: '1m',
    },
  },
  thresholds: buildThresholds(),
};

export default function () {
  runMixedIteration(__VU);
  sleep(1);
}
