import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@smart/contracts';
import { headlineFor } from './candidate-identity';

const baseUser = {
  id: 'u1',
  email: 'student@smart.local',
  fullName: 'Test Student',
  role: 'STUDENT',
  onboardingCompleted: true,
} as AuthenticatedUser;

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
    expect(headlineFor({ ...baseUser, primaryTrack: null }, [])).toBe('SMART candidate');
  });
});
