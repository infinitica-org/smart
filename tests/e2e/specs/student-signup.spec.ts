import { expect, test, type APIRequestContext } from '@playwright/test';
import { apiV1, e2eEnv } from '../helpers/env.js';
import { apiAs, login, seededInstitutionId, uniqueSuffix, waitForMail } from '../helpers/flows.js';

/**
 * S6-VV-146 — wave 1 flow 1: a student signs up, can't sign in until the emailed link is confirmed
 * (S6-VV-142), confirms it, and then lands in the student portal.
 */
test.describe.serial('student self-serve signup', () => {
  let api: APIRequestContext;
  const email = `e2e-${uniqueSuffix()}@${e2eEnv.studentEmail.split('@')[1] ?? 'smart.local'}`;
  const password = `E2e!${uniqueSuffix()}`;

  test.beforeAll(async () => {
    api = await apiAs();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('registration does not sign the student in', async () => {
    const response = await api.post(`${apiV1}/auth/register`, {
      data: {
        email,
        password,
        fullName: 'E2E Student',
        institutionId: await seededInstitutionId(api),
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    expect(await response.json()).not.toHaveProperty('accessToken');
  });

  test('sign-in is refused until the email is verified', async () => {
    const response = await login(api, email, password);
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toBe('email_not_verified');
  });

  test('a resend inside the 60 s cooldown sends nothing new; the emailed link verifies', async () => {
    const [, token] = await waitForMail(api, email, /\/verify-email\/([A-Za-z0-9_-]{20,})/);
    const resend = await api.post(`${apiV1}/auth/verify-email/resend`, { data: { email } });
    expect(resend.status()).toBe(204);
    const inbox = await api.get(
      `${e2eEnv.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    expect((await inbox.json()).messages).toHaveLength(1);

    const verify = await api.post(`${apiV1}/auth/verify-email/${token}`);
    expect(verify.ok(), await verify.text()).toBeTruthy();
    const reuse = await api.post(`${apiV1}/auth/verify-email/${token}`);
    expect(reuse.status()).toBe(410);
  });

  test('once verified, the student signs in as STUDENT', async () => {
    const response = await login(api, email, password);
    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();
    expect(body.user.role).toBe('STUDENT');
    expect(body.accessToken).toBeTruthy();
  });

  test('the web-auth login page sends a student to the student portal', async ({ page }) => {
    await page.goto(`${e2eEnv.authAppUrl}/login`);
    // The redesigned form has placeholders, not visible labels.
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    const toPortal = page.waitForRequest((request) =>
      request.url().startsWith(e2eEnv.studentAppUrl),
    );
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await toPortal;
  });
});
