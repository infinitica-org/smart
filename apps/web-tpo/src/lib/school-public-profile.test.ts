import { describe, expect, it } from 'vitest';
import { buildSchoolPublicProfile } from './school-public-profile';

describe('buildSchoolPublicProfile', () => {
  it('builds profile from entitlements and overrides', () => {
    const profile = buildSchoolPublicProfile(
      {
        planCode: 'PRO',
        flags: [],
        institutionName: 'Riverdale State',
        domain: 'riverdale.edu',
        verificationStatus: 'APPROVED',
        candidateUsage: 88,
        candidateCapacity: 200,
      },
      { tagline: 'Campus careers hub' },
    );
    expect(profile.institutionName).toBe('Riverdale State');
    expect(profile.tagline).toBe('Campus careers hub');
    expect(profile.candidateUsage).toBe(88);
  });
});
