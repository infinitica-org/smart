import { describe, expect, it } from 'vitest';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import {
  buildVerificationByMajorRows,
  buildPlacementOpportunitiesSummary,
  toCsv,
} from './tpo-reports-export';

const student = (overrides: Partial<InstitutionStudentDto>): InstitutionStudentDto => ({
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'a@school.edu',
  fullName: 'Alex',
  batchId: null,
  batchName: 'Comp. Sci',
  inviteStatus: 'ACCEPTED',
  lastSentAt: null,
  acceptedAt: null,
  heldAt: null,
  linkedinUrl: null,
  githubUrl: null,
  ...overrides,
});

describe('buildVerificationByMajorRows', () => {
  it('groups by batch name and computes completion percentage', () => {
    const students = [
      student({ userId: '11111111-1111-4111-8111-111111111111', batchName: 'Comp. Sci' }),
      student({
        userId: '22222222-2222-4222-8222-222222222222',
        batchName: 'Marketing',
        inviteStatus: 'PENDING',
      }),
    ];
    const claims = [
      {
        studentId: '11111111-1111-4111-8111-111111111111',
        status: 'VERIFIED',
      } as SkillClaimDto,
    ];

    const rows = buildVerificationByMajorRows(students, claims);
    expect(rows).toHaveLength(2);
    const cs = rows.find((r) => r.major === 'Comp. Sci');
    expect(cs?.fullyVerified).toBe(1);
    expect(cs?.completionPct).toBe(100);
  });
});

describe('buildPlacementOpportunitiesSummary', () => {
  it('returns whitelisted and application totals', () => {
    const summary = buildPlacementOpportunitiesSummary(
      [student({})],
      [{ studentId: '11111111-1111-4111-8111-111111111111', status: 'VERIFIED' } as SkillClaimDto],
      [{ status: 'OPEN' } as never, { status: 'DRAFT' } as never],
      12,
    );
    expect(summary).toEqual({
      whitelisted: 1,
      fullyVerified: 1,
      activeOpenings: 1,
      totalApplications: 12,
    });
  });
});

describe('toCsv', () => {
  it('includes utf-8 bom and quoted headers', () => {
    expect(toCsv(['Major'], [['Comp. Sci']])).toMatch(/^\uFEFF"Major"/);
  });
});
