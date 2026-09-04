import { describe, expect, it } from 'vitest';
import { CreateCertificateEndorsementRequestSchema } from './candidate-certificate.dto.js';

describe('CreateCertificateEndorsementRequestSchema', () => {
  it('rejects a personal/free-provider email domain', () => {
    const result = CreateCertificateEndorsementRequestSchema.safeParse({
      endorserName: 'Jane Manager',
      endorserEmail: 'jane.manager@gmail.com',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a work-looking email domain', () => {
    const result = CreateCertificateEndorsementRequestSchema.safeParse({
      endorserName: 'Jane Manager',
      endorserEmail: 'jane.manager@acmecorp.com',
    });
    expect(result.success).toBe(true);
  });
});
