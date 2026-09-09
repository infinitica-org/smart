import { describe, expect, it } from 'vitest';
import {
  CertVerifySessionDtoSchema,
  CompleteCertVerifyResponseSchema,
  SubmitCertificateAgendaRequestSchema,
} from './cert-verify.dto.js';

describe('CV-T02 cert verify contracts', () => {
  it('accepts agenda submission with optional expiry', () => {
    const parsed = SubmitCertificateAgendaRequestSchema.parse({
      trackCode: 'TECH_FULLSTACK',
      agendaLines: ['React', 'Node.js', 'PostgreSQL', 'REST APIs', 'Git'],
      expiryDate: '2027-01-01T00:00:00.000Z',
    });
    expect(parsed.agendaLines).toHaveLength(5);
  });

  it('parses a cert verify session without scoring token', () => {
    const parsed = CertVerifySessionDtoSchema.parse({
      sessionId: '11111111-1111-4111-8111-111111111111',
      certificateId: '22222222-2222-4222-8222-222222222222',
      title: 'AWS Cloud Practitioner',
      issuer: 'Amazon',
      timeMinutes: 25,
      passMarkPercent: 80,
      expiresAt: '2026-09-10T12:00:00.000Z',
      serverRemainingSeconds: 1200,
      items: [
        {
          index: 1,
          stem: 'Which service provides object storage?',
          itemType: 'MCQ',
          options: [
            { label: 'A', text: 'S3' },
            { label: 'B', text: 'EC2' },
            { label: 'C', text: 'RDS' },
            { label: 'D', text: 'Lambda' },
          ],
        },
      ],
      answers: [],
    });
    expect(parsed.items[0]?.itemType).toBe('MCQ');
  });

  it('complete response carries certificate not skill claim', () => {
    const parsed = CompleteCertVerifyResponseSchema.parse({
      certificate: {
        certificateId: '22222222-2222-4222-8222-222222222222',
        candidateId: '33333333-3333-4333-8333-333333333333',
        title: 'AWS',
        issuer: 'Amazon',
        status: 'VERIFIED',
        sourceStatus: 'source_verified',
        certificateNumber: null,
        verificationUrl: null,
        verificationMethod: 'ASSESSMENT',
        certificateFileUrl: null,
        certificateFileName: null,
        fileMimeType: null,
        fileSizeBytes: null,
        learningDescription: null,
        tools: [],
        practicalApplied: null,
        practicalDescription: null,
        skills: [],
        expiryDate: '2027-01-01T00:00:00.000Z',
        retryAvailableAt: null,
        lockedUntil: null,
        createdAt: '2026-09-09T00:00:00.000Z',
        updatedAt: '2026-09-09T00:00:00.000Z',
      },
      technicalFailure: false,
      grade: null,
    });
    expect(parsed.certificate.status).toBe('VERIFIED');
  });
});
