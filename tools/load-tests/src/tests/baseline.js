/**
 * Baseline: establish normal performance characteristics at a steady,
 * moderate load — 100 VUs, 15-30 min by default, both configurable. This is
 * the number every later stress/spike/soak run gets compared against.
 */
import { sleep } from 'k6';
import { buildThresholds } from '../config/thresholds.js';
import { runMixedIteration } from '../helpers/traffic-mix.js';
import { handleSummaryFor } from '../helpers/summary.js';

export const handleSummary = handleSummaryFor('baseline');

const VUS = Number(__ENV.BASELINE_VUS || '100');
const DURATION = __ENV.BASELINE_DURATION || '20m';

export const options = {
  scenarios: {
    baseline: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds: buildThresholds(),
};

export default function () {
  runMixedIteration(__VU);
  sleep(1);
}
