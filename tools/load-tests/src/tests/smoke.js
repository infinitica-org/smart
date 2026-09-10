/**
 * Smoke: verify the whole performance environment actually works before
 * trusting any other profile's numbers. Small and fast — 10-20 VUs, 2-5 min
 * by default, both configurable.
 *
 * Must fail if: HTTP errors occur, an important endpoint fails, a dependency
 * is unreachable, or a response-time threshold is violated — enforced two
 * ways: `setup()` hard-fails on unreachable dependencies before any load
 * starts, and every threshold below carries `abortOnFail: true` so a breach
 * stops the run immediately rather than producing a "mostly green" report.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { buildThresholds } from '../config/thresholds.js';
import { runMixedIteration } from '../helpers/traffic-mix.js';
import { timedGet } from '../helpers/http.js';
import { apiLatency } from '../helpers/metrics.js';
import { handleSummaryFor } from '../helpers/summary.js';

export const handleSummary = handleSummaryFor('smoke');

const VUS = Number(__ENV.SMOKE_VUS || '15');
const DURATION = __ENV.SMOKE_DURATION || '3m';

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds: buildThresholds({ abortOnFail: true }),
};

/**
 * Runs once, before any VU starts. A failed dependency check throws here,
 * which aborts the whole run immediately (k6 exits non-zero) — the smoke
 * test's entire purpose is catching exactly this before a 30-minute baseline
 * run wastes time against a broken environment.
 */
export function setup() {
  const checks = [
    ['api /health', `${urls.api}/health`],
    ['api /ready', `${urls.api}/ready`],
    ['web-student', `${urls.student}/health`],
    ['web-tpo', `${urls.tpo}/health`],
    ['web-admin', `${urls.admin}/health`],
    ['web-verify', `${urls.verify}/health`],
    ['web-auth', `${urls.auth}/health`],
  ];

  const failures = [];
  for (const [name, url] of checks) {
    const res = timedGet(url, apiLatency, `smoke_dependency_${name}`);
    if (res.status !== 200) failures.push(`${name} -> HTTP ${res.status} (${url})`);
  }
  if (failures.length > 0) {
    throw new Error(
      `Smoke pre-flight failed — environment is not ready:\n  ${failures.join('\n  ')}`,
    );
  }

  const catalog = timedGet(`${urls.api}${API_PREFIX}/catalog/tracks`, apiLatency, 'smoke_catalog');
  if (catalog.status !== 200) {
    throw new Error(
      `Smoke pre-flight failed — catalog endpoint unreachable: HTTP ${catalog.status}`,
    );
  }
}

export default function () {
  runMixedIteration(__VU);
  sleep(1);
}
