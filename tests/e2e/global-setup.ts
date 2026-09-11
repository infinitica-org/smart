import type { FullConfig } from '@playwright/test';
import { e2eEnv } from './helpers/env.js';

async function assertReachable(label: string, url: string): Promise<void> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      throw new Error(`${label} unreachable at ${url} (HTTP ${response.status})`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} unreachable at ${url}. Start the local stack (see tests/e2e/README.md). ${detail}`,
    );
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await assertReachable('API health', `${e2eEnv.apiUrl}/health`);
  await assertReachable('Mailpit', `${e2eEnv.mailpitUrl}/api/v1/info`);
  await assertReachable('web-verify', `${e2eEnv.verifyAppUrl}/work-experience/health-check-token`);
  await assertReachable('web-auth login', `${e2eEnv.authAppUrl}/login`);
}
