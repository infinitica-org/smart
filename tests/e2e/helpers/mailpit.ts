import type { APIRequestContext } from '@playwright/test';
import { e2eEnv } from './env.js';

interface MailpitMessageSummary {
  ID: string;
  To?: Array<{ Address?: string }>;
  Subject?: string;
}

interface MailpitMessageDetail {
  HTML?: string;
  Text?: string;
}

const VERIFY_URL_PATTERN =
  /https?:\/\/[^\s"'<>]+\/work-experience\/([a-f0-9]{64})|\/work-experience\/([a-f0-9]{64})/gi;

export async function waitForVerificationUrl(
  request: APIRequestContext,
  recipientEmail: string,
  options?: { timeoutMs?: number; mustInclude?: string },
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 45_000;
  const mustInclude = options?.mustInclude;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const listResponse = await request.get(`${e2eEnv.mailpitUrl}/api/v1/messages`);
    if (!listResponse.ok()) {
      throw new Error(`Mailpit list failed: HTTP ${listResponse.status()}`);
    }

    const listBody = (await listResponse.json()) as { messages?: MailpitMessageSummary[] };
    const messages = listBody.messages ?? [];

    for (const message of messages) {
      const recipients = (message.To ?? [])
        .map((entry) => entry.Address?.toLowerCase())
        .filter(Boolean);
      if (!recipients.includes(recipientEmail.toLowerCase())) {
        continue;
      }

      const detailResponse = await request.get(`${e2eEnv.mailpitUrl}/api/v1/message/${message.ID}`);
      if (!detailResponse.ok()) {
        continue;
      }

      const detail = (await detailResponse.json()) as MailpitMessageDetail;
      const content = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`;
      if (mustInclude && !content.includes(mustInclude)) {
        continue;
      }
      VERIFY_URL_PATTERN.lastIndex = 0;
      const match = VERIFY_URL_PATTERN.exec(content);
      if (!match) {
        continue;
      }

      const token = match[1] ?? match[2];
      return `${e2eEnv.verifyAppUrl}/work-experience/${token}`;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  throw new Error(
    `Timed out waiting for verification email to ${recipientEmail} in Mailpit (${e2eEnv.mailpitUrl})`,
  );
}
