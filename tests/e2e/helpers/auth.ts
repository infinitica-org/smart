import type { Page } from '@playwright/test';
import { e2eEnv } from './env.js';

export async function signInViaAuthApp(
  page: Page,
  email: string,
  password: string,
  returnTo: string,
): Promise<void> {
  const loginUrl = new URL('/login', e2eEnv.authAppUrl);
  loginUrl.searchParams.set('returnTo', returnTo);

  await page.goto(loginUrl.toString());
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => url.origin === new URL(returnTo).origin, { timeout: 30_000 });
}
