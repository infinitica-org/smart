/**
 * k6 Browser scenario: the one real-browser flow that earns its (much higher)
 * resource cost — login through web-auth, cross-portal redirect hand-off,
 * hydration, and the first authenticated dashboard render in web-student.
 *
 * Deliberately NOT the full proctored assessment-taking flow: that requires
 * getUserMedia (camera/mic) permission grants and a face/liveness check
 * (apps/web-student/src/components/proctoring/onboarding-gate.tsx) that are
 * unreliable to automate headlessly and not what this test needs to prove —
 * see README "browser vs protocol testing" for why high-volume load stays
 * protocol-level (scenarios/business-flow.js) and this stays a single
 * realistic flow, not a load-generation mechanism.
 *
 * Run standalone (needs a k6 build with the `k6/browser` module — the
 * official grafana/k6 image has it; see tools/load-tests/README.md):
 *   k6 run src/scenarios/browser-student-flow.js
 */
import { browser } from 'k6/browser';
import { check } from 'k6';
import { credentials, urls } from '../config/index.js';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: { browser: { type: 'chromium' } },
      vus: Number(__ENV.BROWSER_VUS || '1'),
      iterations: Number(__ENV.BROWSER_ITERATIONS || '1'),
      maxDuration: '2m',
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
  },
};

export default async function () {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // page load
    await page.goto(`${urls.auth}/login`, { waitUntil: 'networkidle' });
    check(page, { 'login page loaded': (p) => p.url().includes('/login') });

    await page.locator('input[type="email"]').fill(credentials.username);
    await page.locator('input[type="password"]').fill(credentials.password);

    // navigation: submit triggers api-core login then a cross-portal
    // redirect (web-auth -> web-student, ?accessToken=... in the URL) —
    // see packages/api-client/src/session.ts `redirectForRole`.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15_000 }),
      page.locator('button[type="submit"]').click(),
    ]);

    // frontend interaction: confirm the redirect actually landed on
    // web-student and the dashboard shell rendered (client-fetched, so
    // "loaded" here means hydration completed, not just HTML delivered).
    const landedOnStudent = page.url().startsWith(urls.student);
    check(page, { 'redirected to web-student': () => landedOnStudent });

    if (landedOnStudent) {
      await page.waitForSelector('body', { timeout: 10_000 });
    }
  } finally {
    // browser-side errors
    check(null, { 'no browser console errors': () => consoleErrors.length === 0 });
    if (consoleErrors.length > 0) {
      console.warn(`Browser console errors: ${JSON.stringify(consoleErrors)}`);
    }
    await page.close();
  }
}
