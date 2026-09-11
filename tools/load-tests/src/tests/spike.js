/**
 * Spike: 100 users -> sudden jump to 5000 -> hold -> back to 100. Every
 * number and every phase duration is configurable — this is not a fixed
 * shape, just a sensible default for "what does a placement-drive traffic
 * spike do to this stack".
 */
import { sleep } from 'k6';
import { buildThresholds } from '../config/thresholds.js';
import { runMixedIteration } from '../helpers/traffic-mix.js';
import { handleSummaryFor } from '../helpers/summary.js';

export const handleSummary = handleSummaryFor('spike');

const BASE_VUS = Number(__ENV.SPIKE_BASE_VUS || '100');
const PEAK_VUS = Number(__ENV.SPIKE_PEAK_VUS || '5000');
const RAMP_UP_DURATION = __ENV.SPIKE_RAMP_UP_DURATION || '10s';
const HOLD_DURATION = __ENV.SPIKE_HOLD_DURATION || '2m';
const RECOVERY_DURATION = __ENV.SPIKE_RECOVERY_DURATION || '30s';
const SETTLE_DURATION = __ENV.SPIKE_SETTLE_DURATION || '2m';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: BASE_VUS,
      stages: [
        { target: BASE_VUS, duration: '1m' }, // baseline before the spike
        { target: PEAK_VUS, duration: RAMP_UP_DURATION }, // the sudden spike
        { target: PEAK_VUS, duration: HOLD_DURATION }, // hold at peak
        { target: BASE_VUS, duration: RECOVERY_DURATION }, // sudden drop
        { target: BASE_VUS, duration: SETTLE_DURATION }, // does it recover cleanly?
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: buildThresholds(),
};

export default function () {
  runMixedIteration(__VU);
  sleep(1);
}
