import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { CandidateRepositoryProfileView } from './CandidateRepositoryProfileView';

const baseCandidate: InstitutionStudentDto = {
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'ada@campus.edu',
  fullName: 'Ada Lovelace',
  batchId: null,
  batchName: 'Batch 2026',
  inviteStatus: 'ACCEPTED',
  lastSentAt: '2026-01-10T10:00:00.000Z',
  acceptedAt: '2026-01-12T14:00:00.000Z',
  heldAt: null,
  linkedinUrl: 'https://linkedin.com/in/ada',
  githubUrl: null,
};

afterEach(() => {
  cleanup();
});

const mockClaim: SkillClaimDto = {
  claimId: '22222222-2222-4222-8222-222222222222',
  studentId: baseCandidate.userId,
  skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
  proficiency: 'INTERMEDIATE',
  status: 'VERIFIED',
  strikes: 0,
  lockedUntil: null,
  lastAttemptId: null,
};

describe('CandidateRepositoryProfileView', () => {
  it('renders candidate and batch from institution student dto', () => {
    render(
      <CandidateRepositoryProfileView
        candidate={baseCandidate}
        claims={[mockClaim]}
        claimsLoading={false}
        claimsError={null}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Ada Lovelace' })).toBeDefined();
    expect(screen.getByText('ada@campus.edu')).toBeDefined();
    expect(screen.getByText('Batch 2026')).toBeDefined();
    expect(screen.getByText('Onboarding complete')).toBeDefined();
    expect(screen.getByRole('link', { name: /LinkedIn/i })).toBeDefined();
  });

  it('does not show placeholder AI or fake tier badges', () => {
    render(
      <CandidateRepositoryProfileView
        candidate={baseCandidate}
        claims={[]}
        claimsLoading={false}
        claimsError={null}
      />,
    );

    expect(screen.queryByText('AI Match Insights')).toBeNull();
    expect(screen.queryByText('Gold')).toBeNull();
    expect(screen.queryByText(/Building scalable solutions/)).toBeNull();
    expect(screen.getByText(/No skill claims yet/)).toBeDefined();
  });

  it('shows skill claim name and verification badge from backend claims', () => {
    render(
      <CandidateRepositoryProfileView
        candidate={baseCandidate}
        claims={[mockClaim]}
        claimsLoading={false}
        claimsError={null}
      />,
    );

    expect(screen.getAllByText(/JavaScript \/ TypeScript/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Level 2 proficiency/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });
});
