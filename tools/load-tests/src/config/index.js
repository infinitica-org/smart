/**
 * Single source of truth for target URLs, credentials, traffic-mix
 * percentages and safety gates. Every scenario/test imports from here —
 * never hardcode a URL or a traffic-mix percentage anywhere else.
 *
 * This module runs once per k6 VU at init time (k6 re-evaluates the whole
 * module graph per VU), so a thrown error here aborts that VU immediately
 * with a clear message rather than 30 seconds into a run — "fail fast when
 * required configuration is missing".
 */

function str(name, fallback) {
  const raw = __ENV[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

function num(name, fallback) {
  const raw = __ENV[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`${name} must be a number, got: "${raw}"`);
  return n;
}

function bool(name, fallback) {
  const raw = __ENV[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

export const urls = {
  api: str('API_URL', 'http://localhost:3000'),
  student: str('APP_STUDENT_URL', 'http://localhost:3001'),
  tpo: str('APP_TPO_URL', 'http://localhost:3002'),
  admin: str('APP_ADMIN_URL', 'http://localhost:3003'),
  verify: str('APP_VERIFY_URL', 'http://localhost:3004'),
  auth: str('AUTH_URL', 'http://localhost:3005'),
};

/** Generic "the app" target — defaults to web-student, the busiest of the five. */
export const baseUrl = str('BASE_URL', urls.student);

export const API_PREFIX = '/api/v1';

export const credentials = {
  username: str('TEST_USERNAME', 'student@smart.local'),
  password: str('TEST_PASSWORD', 'ChangeMe!Dev'),
};

/** TPO account — seeded by apps/api-core/prisma/seed.ts. Used by the search scenario. */
export const tpoCredentials = {
  username: str('TEST_TPO_USERNAME', 'tpo@smart.local'),
  password: str('TEST_TPO_PASSWORD', credentials.password),
};

export const testDataUsers = num('TEST_DATA_USERS', 200);
export const trackCode = str('TEST_DATA_TRACK_CODE', 'TECH_FULLSTACK');

export const trafficMix = {
  browsing: num('TRAFFIC_BROWSING_PCT', 50),
  search: num('TRAFFIC_SEARCH_PCT', 20),
  apiReads: num('TRAFFIC_API_READS_PCT', 15),
  writes: num('TRAFFIC_WRITES_PCT', 8),
  businessFlow: num('TRAFFIC_BUSINESS_FLOW_PCT', 7),
};

const mixTotal = Object.values(trafficMix).reduce((a, b) => a + b, 0);
if (Math.abs(mixTotal - 100) > 0.01) {
  throw new Error(
    `Traffic mix must sum to 100, got ${mixTotal} — ${JSON.stringify(trafficMix)}. ` +
      'Adjust TRAFFIC_*_PCT env vars (see tools/load-tests/.env.example).',
  );
}

export const safety = {
  allowProductionLoadTest: bool('ALLOW_PRODUCTION_LOAD_TEST', false),
  // L2/L3/L4 evaluation calls real Anthropic/Google AI providers, billed
  // against AI_MONTHLY_CEILING_USD in api-core. Off by default — see
  // scenarios/business-flow.js and tools/load-tests/README.md "Known limitations".
  allowAiEvalLoad: bool('ALLOW_AI_EVAL_LOAD', false),
};

// Heuristic, not exhaustive — a real production hostname will never match
// "localhost"/"127.0.0.1"/a bare Docker-network service name, which is all
// this repo's dev/CI targets ever look like. Update SAFE_HOST_HINTS rather
// than disabling this check if a new non-production environment is added.
const SAFE_HOST_HINTS = ['localhost', '127.0.0.1', '.local', 'host.docker.internal'];

function looksProduction(url) {
  try {
    const { hostname } = new URL(url);
    return !SAFE_HOST_HINTS.some((hint) => hostname.includes(hint));
  } catch {
    // Unparseable URL is a config error, not a production target — let the
    // request itself fail with a clear k6 error instead of masking it here.
    return false;
  }
}

for (const [name, url] of Object.entries(urls)) {
  if (looksProduction(url) && !safety.allowProductionLoadTest) {
    throw new Error(
      `Refusing to run: ${name}=${url} does not look like a local/CI target. ` +
        'Set ALLOW_PRODUCTION_LOAD_TEST=true only if this is a deliberate, ' +
        'authorized production load test — see tools/load-tests/README.md "Production safety".',
    );
  }
}

if (safety.allowProductionLoadTest) {
  console.warn(
    '\n*** ALLOW_PRODUCTION_LOAD_TEST=true — this run is targeting what looks like a ' +
      'production host. This is IRREVERSIBLE traffic against real infrastructure. ***\n',
  );
  if (!bool('CONFIRM_PRODUCTION_LOAD_TEST', false)) {
    throw new Error(
      'ALLOW_PRODUCTION_LOAD_TEST=true also requires CONFIRM_PRODUCTION_LOAD_TEST=true ' +
        '(both, deliberately, so this can never be a single copy-pasted flag).',
    );
  }
}
