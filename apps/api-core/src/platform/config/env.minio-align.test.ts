import { describe, expect, it } from 'vitest';

import { alignS3CredentialsWithMinioRoot, loadEnv } from './env.js';

describe('alignS3CredentialsWithMinioRoot', () => {
  it('uses MINIO_ROOT_PASSWORD when access keys match but secrets differ', () => {
    const base = loadEnv({
      NODE_ENV: 'development',
      JWT_SECRET: 'local-dev-jwt-secret-change-me-now!!',
      S3_ACCESS_KEY: 'smart_dev',
      S3_SECRET_KEY: 'wrong-secret',
      MINIO_ROOT_USER: 'smart_dev',
      MINIO_ROOT_PASSWORD: 'correct-minio-password',
    });
    const aligned = alignS3CredentialsWithMinioRoot(base, {
      MINIO_ROOT_USER: 'smart_dev',
      MINIO_ROOT_PASSWORD: 'correct-minio-password',
    });
    expect(aligned.S3_SECRET_KEY).toBe('correct-minio-password');
  });

  it('leaves credentials unchanged when MinIO root vars are absent', () => {
    const base = loadEnv({
      NODE_ENV: 'development',
      JWT_SECRET: 'local-dev-jwt-secret-change-me-now!!',
      S3_ACCESS_KEY: 'smart',
      S3_SECRET_KEY: 'smartsecret',
    });
    expect(alignS3CredentialsWithMinioRoot(base, {})).toEqual(base);
  });
});
