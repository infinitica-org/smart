/**
 * Weighted scenario picker — the ONE place traffic-mix percentages turn into
 * "which scenario runs this iteration". Every test profile (smoke/baseline/
 * load/stress/spike/soak) calls `runMixedIteration`, so a percentage change
 * in config/index.js changes every profile at once instead of six copies.
 *
 * Login/logout is not its own bucket in the default mix (browsing 50 / search
 * 20 / api-reads 15 / writes 8 / business-flow 7 = 100, matching the task's
 * example split) — apiReads/writes/businessFlow each log in internally, so
 * login_latency is populated by all three without double-counting a
 * dedicated "auth" percentage. scenarios/authentication.js stays available
 * standalone for an auth-focused run (see tests/smoke.js's own auth check).
 */
import { trafficMix } from '../config/index.js';
import { browsingScenario } from '../scenarios/browsing.js';
import { searchScenario } from '../scenarios/catalog-search.js';
import { apiReadsScenario } from '../scenarios/api.js';
import { writesScenario } from '../scenarios/writes.js';
import { businessFlowScenario } from '../scenarios/business-flow.js';
import { pickUser } from './data.js';

const WEIGHTED_SCENARIOS = [
  ['browsing', trafficMix.browsing, () => browsingScenario()],
  ['search', trafficMix.search, () => searchScenario()],
  ['api_reads', trafficMix.apiReads, (user) => apiReadsScenario(user)],
  ['writes', trafficMix.writes, (user) => writesScenario(user)],
  ['business_flow', trafficMix.businessFlow, (user) => businessFlowScenario(user)],
];

/** @returns {string} the name of the scenario category that ran, for logging/debugging. */
export function runMixedIteration(vuId) {
  const user = pickUser(vuId);
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [name, pct, run] of WEIGHTED_SCENARIOS) {
    cumulative += pct;
    if (roll < cumulative) {
      run(user);
      return name;
    }
  }
  // Floating-point rounding safety net — the mix is validated to sum to 100
  // in config/index.js, so this line should be unreachable in practice.
  browsingScenario();
  return 'browsing';
}
