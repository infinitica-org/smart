import { describe, expect, it } from 'vitest';
import {
  AdminCertificateReviewRequestSchema,
  CandidateCertificateDtoSchema,
  CreateCertificateEndorsementRequestSchema,
} from './candidate-certificate.dto.js';

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

describe('CandidateCertificateDtoSchema (CV-T01)', () => {
  it('parses certificate DTO with sourceStatus and verificationUrl', () => {
    const cert = {
      certificateId: '11111111-1111-4111-8111-111111111111',
      candidateId: '22222222-2222-4222-8222-222222222222',
      title: 'AWS Architect',
      issuer: 'AWS',
      status: 'DECLARED',
      sourceStatus: 'source_verified',
      certificateNumber: 'AWS-1234',
      verificationUrl: 'https://aws.amazon.com/verify/1234',
      verificationMethod: null,
      certificateFileUrl: null,
      certificateFileName: null,
      fileMimeType: null,
      fileSizeBytes: null,
      learningDescription: null,
      tools: [],
      practicalApplied: null,
      practicalDescription: null,
      skills: [],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const parsed = CandidateCertificateDtoSchema.safeParse(cert);
    expect(parsed.success).toBe(true);
  });

  it('validates AdminCertificateReviewRequestSchema reason field', () => {
    expect(
      AdminCertificateReviewRequestSchema.safeParse({ reason: 'Verified via badge' }).success,
    ).toBe(true);
    expect(AdminCertificateReviewRequestSchema.safeParse({}).success).toBe(true);
  });
});
