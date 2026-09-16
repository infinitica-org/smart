import { describe, expect, it } from 'vitest';
import { QlixCheckResultSchema, QlixClient } from './qlix-client.js';

describe('QlixClient', () => {
  const client = new QlixClient();

  it('returns a stub check id when QLIX is not configured', async () => {
    const { checkId } = await client.submitCheck({
      githubUrl: 'https://github.com/alice/demo',
      title: 'Demo',
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(checkId).toMatch(/^stub-/);
  });

  it('returns a terminal completed stub result for stub check ids', async () => {
    const result = await client.getCheck('stub-demo');
    expect(client.isTerminal(result)).toBe(true);
    expect(client.isPublishable(result)).toBe(true);
    expect(result.similarityIndex).toBe(12);
  });

  it('accepts agentReview.verdict null from live QLIX payloads', () => {
    const parsed = QlixCheckResultSchema.parse({
      checkId: 'cmu4f0e5r0133ldfkwazjf7th',
      status: 'completed',
      similarityIndex: 8,
      aiLikelihood: 22,
      agentReview: { status: 'completed', verdict: null },
    });
    expect(parsed.agentReview?.verdict).toBeNull();
    expect(client.isPublishable(parsed)).toBe(true);
  });
});
