import { randomInt, randomUUID } from 'node:crypto';
import { expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { apiV1, e2eEnv } from './env.js';

/**
 * S6-VV-146 — shared steps for the wave 1 regression specs.
 *
 * The API trusts X-Forwarded-For (Fastify trustProxy), and the auth routes are rate-limited per IP.
 * Each spec gets its own made-up client IP so one spec's logins can't throttle another's.
 */
export async function apiAs(
  ip = `10.${randomInt(1, 250)}.${randomInt(1, 250)}.${randomInt(1, 250)}`,
) {
  return playwrightRequest.newContext({ extraHTTPHeaders: { 'x-forwarded-for': ip } });
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomUUID().slice(0, 6)}`;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Waits for a Mailpit message to `recipient` whose body matches `pattern`; returns the match. */
export async function waitForMail(
  request: APIRequestContext,
  recipient: string,
  pattern: RegExp,
  timeoutMs = 45_000,
): Promise<RegExpExecArray> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const list = await request.get(
      `${e2eEnv.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${recipient}`)}`,
    );
    expect(list.ok(), 'Mailpit search').toBeTruthy();
    const { messages = [] } = (await list.json()) as { messages?: Array<{ ID: string }> };
    for (const message of messages) {
      const detail = await request.get(`${e2eEnv.mailpitUrl}/api/v1/message/${message.ID}`);
      if (!detail.ok()) continue;
      const body = (await detail.json()) as { HTML?: string; Text?: string };
      const match = pattern.exec(`${body.Text ?? ''}\n${body.HTML ?? ''}`);
      if (match) return match;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`No email to ${recipient} matching ${pattern} within ${timeoutMs} ms`);
}

export async function login(request: APIRequestContext, email: string, password: string) {
  return request.post(`${apiV1}/auth/login`, { data: { email, password } });
}

/** An institution open for self-serve registration (the seeded pilot institute on a fresh stack). */
export async function seededInstitutionId(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${apiV1}/auth/institutions`);
  expect(response.ok(), 'GET /auth/institutions').toBeTruthy();
  const list = (await response.json()) as Array<{ id: string; name: string }>;
  const first = list[0];
  if (!first) throw new Error('No institution is open for self-serve registration');
  return first.id;
}

/** Registers a student and confirms the emailed link, the way a real student would. */
export async function registerVerifiedStudent(request: APIRequestContext) {
  const email = `e2e-${uniqueSuffix()}@${e2eEnv.studentEmail.split('@')[1] ?? 'smart.local'}`;
  const password = `E2e!${uniqueSuffix()}`;
  const register = await request.post(`${apiV1}/auth/register`, {
    data: {
      email,
      password,
      fullName: 'E2E Student',
      institutionId: await seededInstitutionId(request),
    },
  });
  expect(register.status(), await register.text()).toBe(201);
  const [, token] = await waitForMail(request, email, /\/verify-email\/([A-Za-z0-9_-]{20,})/);
  const verify = await request.post(`${apiV1}/auth/verify-email/${token}`);
  expect(verify.ok(), await verify.text()).toBeTruthy();
  return { email, password };
}
