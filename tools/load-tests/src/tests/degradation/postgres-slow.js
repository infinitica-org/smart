/**
 * Degradation test: Postgres unavailable. Verifies connection pool /
 * timeout behaviour — PrismaService (apps/api-core/src/platform/prisma/
 * prisma.service.ts) is configured `max: 20` per instance with no PgBouncer,
 * and its own onModuleInit already logs-and-continues rather than crashing
 * boot when Postgres is down; this test is what a live outage under traffic
 * looks like, not just at startup.
 *
 * OPT-IN AND MANUAL:
 *   docker compose -f infra/docker/docker-compose.yml stop postgres
 *   k6 run src/tests/degradation/postgres-slow.js
 *   docker compose -f infra/docker/docker-compose.yml start postgres
 *
 * Known limitation — this exercises "unavailable", not "slow": genuinely
 * injecting latency (vs. taking the dependency down entirely) needs a
 * network fault-injection proxy (e.g. Toxiproxy) sitting in front of
 * Postgres, which this stack does not have today. Adding one is a real,
 * separate infra change (a new compose service + repointing DATABASE_URL
 * through it) — out of scope here rather than faked with a `pg_sleep`
 * trigger that wouldn't reproduce real connection-pool exhaustion behaviour.
 * Recommended follow-up, not implemented: see README "Known limitations".
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../../config/index.js';
import { login } from '../../helpers/auth.js';
import { authHeaders, timedGet } from '../../helpers/http.js';
import { apiLatency } from '../../helpers/metrics.js';
import { pickUser } from '../../helpers/data.js';

const VUS = Number(__ENV.DEGRADATION_VUS || '30');
const DURATION = __ENV.DEGRADATION_DURATION || '2m';

export const options = {
  scenarios: {
    postgres_down: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds: {
    // Loose on purpose — see redis-down.js for why. This still catches a hang.
    http_req_failed: ['rate<0.9'],
  },
};

export default function () {
  const user = pickUser(__VU);
  const session = login(user.email, user.password);
  if (session) {
    timedGet(`${urls.api}${API_PREFIX}/users/me`, apiLatency, 'postgres_down_users_me', {
      headers: authHeaders(session.accessToken),
    });
  }
  // /ready itself queries Postgres (`SELECT 1`) — a fast, clean 503 here (not
  // a hang) is exactly the "connection pool times out, doesn't queue forever"
  // behaviour this test is checking for.
  timedGet(`${urls.api}/ready`, apiLatency, 'postgres_down_ready');
  sleep(1);
}
