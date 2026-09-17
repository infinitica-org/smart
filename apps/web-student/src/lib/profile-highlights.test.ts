import { describe, expect, it } from 'vitest';

import { buildProfileHighlights } from './profile-highlights';

describe('buildProfileHighlights', () => {
  it('returns null cards when data is missing', () => {
    const result = buildProfileHighlights({
      experiences: [],
      education: [],
      onboardingProfile: null,
      onboardingDraft: null,
      roleHeadline: 'Software Engineer candidate',
    });

    expect(result.experience).toBeNull();
    expect(result.education).toBeNull();
    expect(result.location).toBeNull();
    expect(result.rolePreference).toBeNull();
  });

  it('summarizes education and location from existing profile data', () => {
    const result = buildProfileHighlights({
      experiences: [],
      education: [
        {
          id: '1',
          studentId: 's1',
          institutionName: 'SMART University',
          degree: 'B.Tech',
          fieldOfStudy: 'Computer Science',
          startDate: null,
          endDate: null,
          current: false,
          grade: null,
          status: 'unverified',
          rejectionReason: null,
          documents: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      onboardingProfile: {
        jobPreferences: {
          expectedCtcLakhs: 8,
          currentLocation: 'Bengaluru, India',
          preferredLocations: ['Bengaluru, India'],
          preferredWorkModes: ['FULL_TIME'],
        },
      } as never,
      onboardingDraft: null,
      roleHeadline: 'Software Engineer candidate',
    });

    expect(result.education?.primary).toBe('B.Tech');
    expect(result.location?.primary).toBe('Bengaluru, India');
    expect(result.rolePreference?.secondary).toContain('Full-time');
  });
});
