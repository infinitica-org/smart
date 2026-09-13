import { describe, expect, it } from 'vitest';
import { TrackCodeSchema } from '../domain/enums.js';
import {
  CompleteCandidateOnboardingRequestSchema,
  INTEREST_DOMAIN_LABELS,
} from './candidate-onboarding.dto.js';

function minimalCompletion(overrides: Record<string, unknown> = {}) {
  return {
    interestDomain: 'CS_IT',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneCountryCode: '+91',
    phoneNumber: '9876543210',
    dpdpConsent: true as const,
    ...overrides,
  };
}

describe('CompleteCandidateOnboardingRequestSchema (progressive onboarding)', () => {
  it('accepts valid minimal onboarding completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(minimalCompletion());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.interestDomain).toBe('CS_IT');
    expect(parsed.data.skills).toEqual([]);
    expect(parsed.data.jobPreferences).toBeUndefined();
    expect(parsed.data.socialVerification).toBeUndefined();
    expect(parsed.data.skillDiscovery).toBeUndefined();
  });

  it('rejects completion when interestDomain is missing', () => {
    const { interestDomain: _removed, ...withoutDomain } = minimalCompletion();
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(withoutDomain);
    expect(parsed.success).toBe(false);
  });

  it('rejects completion when firstName is missing', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({ firstName: '' }),
    );
    expect(parsed.success).toBe(false);
  });

  it('rejects completion when lastName is missing', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({ lastName: '' }),
    );
    expect(parsed.success).toBe(false);
  });

  it('rejects completion when phoneNumber is missing', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({ phoneNumber: '' }),
    );
    expect(parsed.success).toBe(false);
  });

  it('rejects completion without DPDP consent', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({ dpdpConsent: false }),
    );
    expect(parsed.success).toBe(false);
  });

  it('does not require skills at completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(minimalCompletion());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.skills).toEqual([]);
  });

  it('does not require language skills at completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({ skills: [] }),
    );
    expect(parsed.success).toBe(true);
  });

  it('does not require LinkedIn or GitHub at completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(minimalCompletion());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.linkedinUrl).toBeUndefined();
    expect(parsed.data.githubUrl).toBeUndefined();
  });

  it('does not require social verification at completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(minimalCompletion());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.socialVerification).toBeUndefined();
  });

  it('does not require job preferences at completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(minimalCompletion());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.jobPreferences).toBeUndefined();
  });

  it('accepts deferred profile fields when supplied without blocking completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({
        linkedinUrl: 'https://www.linkedin.com/in/ada',
        githubUrl: 'https://github.com/ada',
        skills: [
          { type: 'language', name: 'English', proficiency: 'Fluent' },
          { type: 'technical', name: 'Git & version control', proficiency: 'INTERMEDIATE' },
        ],
        jobPreferences: {
          expectedCtcLakhs: 8,
          currentLocation: 'Bengaluru',
          preferredLocations: ['Bengaluru'],
        },
        socialVerification: {
          linkedin: { verified: true, verifiedAt: '2026-09-01T00:00:00.000Z' },
          github: null,
        },
        skillDiscovery: {
          suggestedFromGithub: [],
          selectedSkillNames: ['Python'],
          customSkillNames: [],
        },
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it('does not require a career track or primaryTrack code for completion', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(minimalCompletion());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect('primaryTrack' in parsed.data).toBe(false);
    expect('trackCode' in parsed.data).toBe(false);
    expect(TrackCodeSchema.safeParse('TECH_FULLSTACK').success).toBe(true);
  });

  it('exposes human-readable interest domain labels', () => {
    expect(INTEREST_DOMAIN_LABELS.CS_IT).toBe('CS & IT');
    expect(INTEREST_DOMAIN_LABELS.BUSINESS_MANAGEMENT).toBe('Business & Management');
    expect(INTEREST_DOMAIN_LABELS.FINANCE).toBe('Finance');
    expect(INTEREST_DOMAIN_LABELS.OTHER).toBe('Other');
  });
});

describe('InterestDomainSchema', () => {
  it('rejects unknown interest domain values', () => {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(
      minimalCompletion({ interestDomain: 'TECH_FULLSTACK' }),
    );
    expect(parsed.success).toBe(false);
  });
});
