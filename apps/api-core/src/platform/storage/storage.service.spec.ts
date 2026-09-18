import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rewriteSignedUrlForBrowser } from './storage.service.js';

vi.mock('../config/env.js', () => ({
  env: {
    S3_ENDPOINT: 'http://minio:9000',
    S3_PUBLIC_ENDPOINT: undefined as string | undefined,
  },
}));

describe('rewriteSignedUrlForBrowser', () => {
  beforeEach(async () => {
    const { env } = await import('../config/env.js');
    env.S3_ENDPOINT = 'http://minio:9000';
    env.S3_PUBLIC_ENDPOINT = undefined;
  });

  it('returns the signed URL unchanged when no public endpoint is configured', async () => {
    const signed = 'http://minio:9000/smart/project-defense/p1/turn.webm?X-Amz-Signature=abc';
    expect(rewriteSignedUrlForBrowser(signed)).toBe(signed);
  });

  it('rewrites the host when S3_PUBLIC_ENDPOINT differs from S3_ENDPOINT', async () => {
    const { env } = await import('../config/env.js');
    env.S3_PUBLIC_ENDPOINT = 'http://127.0.0.1:9000';

    const signed = 'http://minio:9000/smart/project-defense/p1/turn.webm?X-Amz-Signature=abc';
    expect(rewriteSignedUrlForBrowser(signed)).toBe(
      'http://127.0.0.1:9000/smart/project-defense/p1/turn.webm?X-Amz-Signature=abc',
    );
  });
});
