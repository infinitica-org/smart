import { describe, expect, it } from 'vitest';

import type { CandidateCertificateDto } from '@smart/contracts';

import {
  certificateManageCtaLabel,
  certificateNeedsAssessment,
  certificateProofSummary,
  certificateStatusLabel,
} from '@/lib/certificate-entry-presenters';

function baseCert(overrides: Partial<CandidateCertificateDto> = {}): CandidateCertificateDto {
  return {
    certificateId: '00000000-0000-4000-8000-000000000001',
    candidateId: '00000000-0000-4000-8000-000000000002',
    title: 'AWS Solutions Architect',
    issuer: 'Amazon Web Services',
    status: 'UPLOADED',
    sourceStatus: 'pending',
    certificateNumber: null,
    issueDate: '2024-06-01',
    expiryDate: null,
    verificationUrl: null,
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
    skillsClaimedSnapshot: null,
    trackCode: null,
    agendaLines: [],
    retryAvailableAt: null,
    lockedUntil: null,
    taxonomyVersionSnapshot: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('certificate-entry-presenters', () => {
  it('maps status to readable labels', () => {
    expect(certificateStatusLabel('VERIFIED')).toBe('Verified');
    expect(certificateStatusLabel('IN_VERIFICATION')).toBe('In verification');
  });

  it('summarizes proof from file name or verification URL', () => {
    expect(certificateProofSummary(baseCert()).detail).toBe('Not uploaded');
    expect(certificateProofSummary(baseCert({ certificateFileName: 'aws-cert.pdf' })).detail).toBe(
      'aws-cert.pdf',
    );
    expect(
      certificateProofSummary(baseCert({ verificationUrl: 'https://www.coursera.org/verify/abc' }))
        .detail,
    ).toBe('coursera.org');
  });

  it('chooses manage CTA copy from workflow status', () => {
    expect(certificateManageCtaLabel('DECLARED')).toBe('Continue');
    expect(certificateManageCtaLabel('VERIFIED')).toBe('View details');
  });

  it('detects when assessment link should show', () => {
    expect(
      certificateNeedsAssessment(
        baseCert({
          status: 'IN_VERIFICATION',
          sourceStatus: 'source_verified',
          agendaLines: ['Describe how you applied this certification in practice.'],
        }),
      ),
    ).toBe(true);
    expect(
      certificateNeedsAssessment(
        baseCert({ status: 'VERIFIED', sourceStatus: 'source_verified', agendaLines: [] }),
      ),
    ).toBe(false);
  });
});
