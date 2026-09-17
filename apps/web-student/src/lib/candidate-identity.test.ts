import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@smart/contracts';
import { headlineFor } from './candidate-identity';

const baseUser: AuthenticatedUser = {
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'student@smart.local',
  fullName: 'Test Student',
  role: 'STUDENT',
  institutionId: null,
  institutionName: null,
  primaryTrack: null,
  secondaryTrack: null,
  provider: 'PASSWORD',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  onboardingCompleted: true,
  profilePhotoUrl: null,
  cgpa: null,
  sscPercentage: null,
  hscPercentage: null,
  sessionHold: null,
};

describe('headlineFor', () => {
  it('uses the onboarding stream role instead of the certification track name', () => {
    expect(
      headlineFor({ ...baseUser, primaryTrack: 'TECH_FULLSTACK' }, [
        { code: 'TECH_FULLSTACK', name: 'Full Stack Developer' } as never,
      ]),
    ).toBe('Software Engineer candidate');
  });

  it('falls back to catalog track name when no stream mapping exists', () => {
    expect(
      headlineFor({ ...baseUser, primaryTrack: 'MBA_FINANCE' }, [
        { code: 'MBA_FINANCE', name: 'Finance Analyst' } as never,
      ]),
    ).toBe('Finance Analyst candidate');
  });

  it('returns SMART candidate when track is unset', () => {
    expect(headlineFor(baseUser, [])).toBe('SMART candidate');
  });
});
