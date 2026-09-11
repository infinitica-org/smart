/**
 * End-of-test summary, formatted to exactly the fields the task spec asks
 * for (Test/Duration/Target/Actual RPS/Requests/Successful/Failed/p50/p95/p99/
 * Peak VUs/Thresholds PASS-FAIL), plus a machine-readable JSON dump next to
 * it for later capacity-report aggregation (see CAPACITY_REPORT.md).
 *
 * Deliberately does not depend on k6's jslib CDN summary helper (avoids a
 * network fetch at test-parse time — this stays usable fully offline/in CI).
 */

function pct(metric, key) {
  return metric && metric.values && typeof metric.values[key] === 'number'
    ? metric.values[key].toFixed(1)
    : 'n/a';
}

export function buildSummaryText(testName, data) {
  const m = data.metrics ?? {};
  const httpReqs = m.http_reqs;
  const httpDuration = m.http_req_duration;
  const httpFailed = m.http_req_failed;
  const vus = m.vus_max ?? m.vus;

  const totalRequests = httpReqs?.values?.count ?? 0;
  const failedRate = httpFailed?.values?.rate ?? 0;
  const failedCount = Math.round(totalRequests * failedRate);
  const successfulCount = totalRequests - failedCount;
  const actualRps = httpReqs?.values?.rate ?? 0;
  const durationSeconds = data.state?.testRunDurationMs
    ? data.state.testRunDurationMs / 1000
    : undefined;
  const peakVus = vus?.values?.value ?? vus?.values?.max ?? 'n/a';

  const thresholdFailures = [];
  for (const [name, metric] of Object.entries(m)) {
    if (!metric.thresholds) continue;
    for (const [expr, result] of Object.entries(metric.thresholds)) {
      if (!result.ok) thresholdFailures.push(`${name}: ${expr}`);
    }
  }

  return [
    `Test:               ${testName}`,
    `Duration:           ${durationSeconds ? `${durationSeconds.toFixed(0)}s` : 'n/a'}`,
    `Actual RPS:         ${actualRps.toFixed(2)}`,
    '',
    `Requests:           ${totalRequests}`,
    `Successful:         ${successfulCount}`,
    `Failed:             ${failedCount} (${(failedRate * 100).toFixed(2)}%)`,
    '',
    `p50:                ${pct(httpDuration, 'med')}ms`,
    `p95:                ${pct(httpDuration, 'p(95)')}ms`,
    `p99:                ${pct(httpDuration, 'p(99)')}ms`,
    '',
    `Peak VUs:           ${peakVus}`,
    '',
    `Thresholds:         ${thresholdFailures.length === 0 ? 'PASS' : 'FAIL'}`,
    ...thresholdFailures.map((f) => `  FAILED: ${f}`),
    '',
    'Inspect the corresponding Grafana dashboard during/after the run:',
    '  http://localhost:3100/d/smart-platform-overview (or 3100 -> your GRAFANA_PORT)',
    '  http://localhost:3100/d/smart-api-metrics',
  ].join('\n');
}

/** `export const handleSummary = handleSummaryFor('smoke')` in each test file. */
export function handleSummaryFor(testName) {
  return function handleSummary(data) {
    const text = buildSummaryText(testName, data);
    return {
      stdout: `${text}\n`,
      [`summary-${testName}.json`]: JSON.stringify(data, null, 2),
    };
  };
}
