import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentReadinessDetail } from './StudentReadinessDetail';
import { universityApi } from '../../lib/api';

vi.mock('../../lib/api', () => ({ universityApi: { summary: vi.fn(), messageStudent: vi.fn() } }));

function summary(over: Record<string, unknown> = {}) {
  return {
    student: {
      userId: '11111111-1111-4111-8111-111111111111',
      fullName: 'Asha Rao',
      email: 'asha@uni.edu',
      program: 'B.Tech CSE',
      graduationYear: 2026,
      verificationStatus: 'VERIFIED',
      verifiedSkillCount: 1,
      declaredSkillCount: 0,
      needsAssistance: false,
      batchName: null,
    },
    verification: {
      identity: { status: 'VERIFIED', signals: [], supportedStatuses: [], rule: '' },
      evidence: {
        availability: 'AVAILABLE',
        reason: null,
        requirements: [],
        counts: {
          total: 0,
          verified: 0,
          provisional: 0,
          pending: 0,
          disputedOrRejected: 0,
          expired: 0,
        },
        completeness: { required: 2, available: 1, percent: 50 },
      },
      skillDemonstration: {
        skills: [],
        counts: { demonstrated: 1, provisional: 0, notDemonstrated: 0 },
      },
      proficiency: { verifiedSkillCount: 1, declaredSkillCount: 0, byLevel: {} },
    },
    missingEvidence: [],
    opportunities: [],
    ...over,
  } as never;
}

describe('StudentReadinessDetail', () => {
  beforeEach(() => vi.mocked(universityApi.summary).mockReset());
  afterEach(cleanup);

  it('shows completeness separately from proficiency', async () => {
    vi.mocked(universityApi.summary).mockResolvedValue(summary());
    render(<StudentReadinessDetail userId="u" />);
    expect(await screen.findByText(/1 of 2 required items \(50%\)/)).toBeDefined();
    expect(screen.getByText(/Proficiency \(kept separate from completeness\)/)).toBeDefined();
  });

  it('lists each missing REQUIRED item with what is needed', async () => {
    vi.mocked(universityApi.summary).mockResolvedValue(
      summary({
        missingEvidence: [
          {
            skillCode: 'PY',
            skillName: 'Python',
            level: 'INTERMEDIATE',
            requirement: 'REAL_WORLD_APPLICATION',
            needed: 'Evidence of real-world use of Python at INTERMEDIATE level.',
          },
        ],
      }),
    );
    render(<StudentReadinessDetail userId="u" />);
    expect(await screen.findByText('Python (INTERMEDIATE)')).toBeDefined();
    expect(screen.getByText(/Evidence of real-world use of Python/)).toBeDefined();
  });

  it('does not present an absent optional item as a gap', async () => {
    vi.mocked(universityApi.summary).mockResolvedValue(summary());
    render(<StudentReadinessDetail userId="u" />);
    expect(await screen.findByText('No missing required evidence')).toBeDefined();
  });

  it('shows an explicit empty state for placements', async () => {
    vi.mocked(universityApi.summary).mockResolvedValue(summary());
    render(<StudentReadinessDetail userId="u" />);
    expect(await screen.findByText('No applications yet')).toBeDefined();
  });

  it('shows application and offer status', async () => {
    vi.mocked(universityApi.summary).mockResolvedValue(
      summary({
        opportunities: [
          {
            applicationId: 'a',
            roleTitle: 'SDE',
            companyName: 'Acme',
            stage: 'OFFER',
            appliedAt: '2026-09-01T00:00:00.000Z',
            offerOutcome: 'ACCEPTED',
            joiningOutcome: null,
            joiningDate: null,
          },
        ],
      }),
    );
    render(<StudentReadinessDetail userId="u" />);
    expect(await screen.findByText('SDE')).toBeDefined();
    expect(screen.getByText('Offer ACCEPTED')).toBeDefined();
  });

  it('shows not-found for an out-of-scope student without leaking why', async () => {
    vi.mocked(universityApi.summary).mockRejectedValueOnce(
      Object.assign(new Error('Student not found.'), { statusCode: 404 }),
    );
    render(<StudentReadinessDetail userId="u" />);
    expect(await screen.findByText('Student not found')).toBeDefined();
  });
});
