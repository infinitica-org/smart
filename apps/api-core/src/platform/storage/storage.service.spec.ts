import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertBucketEncrypted,
  rewriteSignedUrlForBrowser,
  serverSideEncryption,
} from './storage.service.js';

vi.mock('../config/env.js', () => ({
  env: {
    S3_ENDPOINT: 'http://minio:9000',
    S3_PUBLIC_ENDPOINT: undefined as string | undefined,
    S3_ENCRYPTION: 'off' as 'off' | 'required',
  },
}));

describe('S6-VV-119 storage encryption', () => {
  it('asks for SSE on server-side writes only when encryption is required', async () => {
    const { env } = await import('../config/env.js');
    env.S3_ENCRYPTION = 'off';
    expect(serverSideEncryption()).toEqual({});
    env.S3_ENCRYPTION = 'required';
    expect(serverSideEncryption()).toEqual({ ServerSideEncryption: 'AES256' });
    env.S3_ENCRYPTION = 'off';
  });

  it('passes when the bucket has a default encryption rule', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        ServerSideEncryptionConfiguration: {
          Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
        },
      }),
    };
    await expect(assertBucketEncrypted(client as never, 'smart')).resolves.toBeUndefined();
  });

  it('fails fast when the bucket has no encryption config', async () => {
    const missing = Object.assign(new Error('not found'), {
      name: 'ServerSideEncryptionConfigurationNotFoundError',
    });
    const client = { send: vi.fn().mockRejectedValue(missing) };
    await expect(assertBucketEncrypted(client as never, 'smart')).rejects.toThrow(
      /S3_ENCRYPTION=required but bucket "smart" has no default encryption/,
    );
  });
});

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
