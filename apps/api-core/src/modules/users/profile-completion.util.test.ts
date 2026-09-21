import { describe, expect, it } from 'vitest';
import type { ProfileProgressInput } from './profile-completion.util.js';
import {
  canVerifySkills,
  computeProfileCompletion,
  isProfileCompleteForSkillVerification,
} from './profile-completion.util.js';

function emptyInput(overrides: Partial<ProfileProgressInput> = {}): ProfileProgressInput {
  return {
    skillClaims: [],
    onboardingProfile: null,
    onboardingDraft: null,
    languages: [],
    education: [],
    experiences: [],
    projects: [],
    certificates: [],
    ...overrides,
  };
}

function completeInput(): ProfileProgressInput {
  return emptyInput({
    skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
    languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
    education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
    experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Intern' } as never],
    projects: [{ projectId: 'prj_1', title: 'App' } as never],
    certificates: [{ certificateId: 'cert_1', title: 'AWS' } as never],
    onboardingProfile: {
      linkedinUrl: 'https://linkedin.com/in/ada',
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
      },
    } as never,
  });
}

describe('canVerifySkills', () => {
  it('blocks profiles below 10%', () => {
    expect(canVerifySkills(0)).toBe(false);
    expect(canVerifySkills(9)).toBe(false);
  });

  it('allows 10% and does not block values above 10%', () => {
    expect(canVerifySkills(10)).toBe(true);
    expect(canVerifySkills(100)).toBe(true);
    expect(canVerifySkills(101)).toBe(true);
  });

  it('treats nullish percent as incomplete', () => {
    expect(canVerifySkills(null)).toBe(false);
    expect(canVerifySkills(undefined)).toBe(false);
  });
});

describe('isProfileCompleteForSkillVerification', () => {
  it('returns false at 0% profile completion', () => {
    expect(isProfileCompleteForSkillVerification(emptyInput())).toBe(false);
    expect(computeProfileCompletion(emptyInput()).percent).toBe(0);
  });

  it('returns true once profile reaches the unlock threshold (one of eight areas)', () => {
    const input = emptyInput({
      skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
    });
    expect(isProfileCompleteForSkillVerification(input)).toBe(true);
    expect(computeProfileCompletion(input).percent).toBe(13);
  });

  it('returns true at 50% profile completion (four of eight areas)', () => {
    const input = emptyInput({
      skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
      languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
      education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
      experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Intern' } as never],
    });
    expect(isProfileCompleteForSkillVerification(input)).toBe(true);
    expect(computeProfileCompletion(input).percent).toBe(50);
  });

  it('returns true when all eight areas are complete', () => {
    expect(isProfileCompleteForSkillVerification(completeInput())).toBe(true);
  });
});
