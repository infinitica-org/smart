import { describe, expect, it } from 'vitest';
import { toCandidateApplicationDto } from './placement.service.js';

const row = (company: Record<string, unknown> | null | undefined) =>
  ({
    id: '00000000-0000-4000-8000-000000000001',
    openingId: '00000000-0000-4000-8000-000000000010',
    studentId: '00000000-0000-4000-8000-000000000020',
    stage: 'SHORTLISTED',
    matchScore: 0.9,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-02T00:00:00Z'),
    opening: {
      companyName: 'Acme',
      roleTitle: 'Engineer',
      location: 'Pune',
      employmentType: null,
      domainCode: null,
      company,
    },
  }) as never;

const approved = {
  verificationStatus: 'APPROVED',
  deactivatedAt: null,
  heldAt: null,
  verifications: [{ reviewedAt: new Date('2026-08-30T10:00:00Z') }],
};

describe('toCandidateApplicationDto verified flag (Th6-354)', () => {
  it('marks an approved, active company verified with the server date', () => {
    expect(toCandidateApplicationDto(row(approved))).toMatchObject({
      companyVerified: true,
      companyVerifiedAt: '2026-08-30T10:00:00.000Z',
    });
  });

  it.each([
    ['pending', { ...approved, verificationStatus: 'PENDING' }],
    ['rejected', { ...approved, verificationStatus: 'REJECTED' }],
    ['held', { ...approved, heldAt: new Date() }],
    ['deactivated', { ...approved, deactivatedAt: new Date() }],
    ['no linked company', null],
    ['legacy opening', undefined],
  ])('is not verified for a %s company', (_label, company) => {
    expect(toCandidateApplicationDto(row(company))).toMatchObject({
      companyVerified: false,
      companyVerifiedAt: null,
    });
  });
});
