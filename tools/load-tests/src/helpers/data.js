/**
 * Test-user pool, loaded via k6's SharedArray so the JSON is parsed once and
 * shared read-only across every VU — not duplicated per-VU in memory (the
 * task's "avoid loading enormous datasets into k6 memory" requirement).
 *
 * The file itself is produced by `pnpm --filter @smart/api-core
 * db:seed:load-test` (see apps/api-core/prisma/seed-load-test.ts) and holds
 * emails only, never passwords — the shared TEST_PASSWORD comes from config
 * at run time.
 */
import { SharedArray } from 'k6/data';
import { credentials, trackCode } from '../config/index.js';

export const userPool = new SharedArray('load-test users', function () {
  try {
    const raw = open('../data/users.json');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.emails) || data.emails.length === 0) throw new Error('empty');
    return data.emails.map((email) => ({ email, password: credentials.password }));
  } catch {
    // No fixture yet — fall back to the single demo account seeded by the
    // base `pnpm db:seed`. Fine for smoke; anything with real concurrency
    // (load/stress/spike/soak, cache-stampede) needs many distinct accounts
    // or every VU collides on the same in-progress attempt. See README.
    return [{ email: credentials.username, password: credentials.password }];
  }
});

export function pickUser(vuId) {
  return userPool[(vuId - 1) % userPool.length];
}

export const activeTrackCode = trackCode;
export const hasRealUserPool = userPool.length > 1;
