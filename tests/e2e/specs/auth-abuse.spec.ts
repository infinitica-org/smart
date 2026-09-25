import { expect, test } from '@playwright/test';
import { apiV1 } from '../helpers/env.js';
import { apiAs, login, registerVerifiedStudent, uniqueSuffix } from '../helpers/flows.js';

/**
 * S6-VV-146 — wave 1 flow 4: brute-force defences. Each test uses its own client IP, so the per-IP
 * limits it trips can't leak into the other specs.
 */
test.describe.serial('auth abuse defences', () => {
  test('five wrong passwords lock the account, even for the right password (S6-VV-92)', async () => {
    const api = await apiAs();
    try {
      const { email, password } = await registerVerifiedStudent(api);

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const wrong = await login(api, email, `Wrong-password-${attempt}`);
        expect(wrong.status(), `attempt ${attempt}`).toBe(401);
      }

      const locked = await login(api, email, password);
      expect(locked.status()).toBe(429);
      const body = await locked.json();
      expect(body.error).toBe('account_locked');
      expect(body.retryAfterSeconds).toBeGreaterThan(0);
    } finally {
      await api.dispose();
    }
  });

  test('hammering /auth/login from one IP gets 429 with Retry-After', async () => {
    const api = await apiAs();
    try {
      const statuses: number[] = [];
      let throttled: Awaited<ReturnType<typeof login>> | undefined;
      for (let attempt = 0; attempt < 20 && !throttled; attempt += 1) {
        // Different unknown accounts each time: this is the IP limit, not the account lockout.
        const response = await login(api, `nobody-${uniqueSuffix()}@example.com`, 'irrelevant');
        statuses.push(response.status());
        if (response.status() === 429) throttled = response;
      }

      if (!throttled) throw new Error(`never throttled; statuses: ${statuses.join(',')}`);
      expect(Number(throttled.headers()['retry-after'])).toBeGreaterThan(0);
      expect((await throttled.json()).error).toBe('rate_limit_exceeded');
      expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true);
    } finally {
      await api.dispose();
    }
  });

  test('after that, a different IP is still let through', async () => {
    const api = await apiAs();
    try {
      const response = await login(api, `nobody-${uniqueSuffix()}@example.com`, 'irrelevant');
      expect(response.status()).toBe(401);
      expect(Number(response.headers()['x-ratelimit-remaining'])).toBeGreaterThan(0);
    } finally {
      await api.dispose();
    }
  });
});

test('registration is limited per IP too', async () => {
  const api = await apiAs();
  try {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      // An invalid body still counts against the limit, and creates nothing.
      const response = await api.post(`${apiV1}/auth/register`, { data: {} });
      statuses.push(response.status());
      if (response.status() === 429) break;
    }
    expect(statuses, statuses.join(',')).toContain(429);
  } finally {
    await api.dispose();
  }
});
