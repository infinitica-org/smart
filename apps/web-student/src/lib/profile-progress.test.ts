import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ProfileProgressInput } from './profile-progress';
import {
  RECOMMENDED_ACTION_DISMISSAL_MS,
  computeProfileCompletion,
  dismissRecommendedAction,
  isRecommendedActionDismissed,
  recommendNextAction,
  resolveVisibleRecommendedAction,
  profileStrengthFromPercent,
} from './profile-progress';

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

describe('computeProfileCompletion', () => {
  it('returns 0% when no data is present', () => {
    const result = computeProfileCompletion(emptyInput());
    expect(result.percent).toBe(0);
    expect(result.completedAreas).toEqual([]);
    expect(result.incompleteAreas).toHaveLength(8);
  });

  it('returns 13% when one area is complete', () => {
    const result = computeProfileCompletion(
      emptyInput({ education: [{ id: 'edu_1', institutionName: 'MIT' } as never] }),
    );
    expect(result.percent).toBe(13);
  });

  it('returns 50% when four areas are complete', () => {
    const result = computeProfileCompletion(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        projects: [{ projectId: 'prj_1', title: 'App' } as never],
      }),
    );
    expect(result.percent).toBe(50);
  });

  it('returns 100% when all eight areas are complete', () => {
    const result = computeProfileCompletion(
      emptyInput({
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
      }),
    );
    expect(result.percent).toBe(100);
  });

  it('marks skills complete from skill claims', () => {
    const result = computeProfileCompletion(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'DECLARED' } as never],
      }),
    );
    expect(result.areaStatus.skills).toBe(true);
  });

  it('marks skills complete from onboarding declared skills', () => {
    const result = computeProfileCompletion(
      emptyInput({
        onboardingDraft: {
          skills: [{ type: 'technical', name: 'Python', proficiency: 'ADVANCED' }],
        },
      }),
    );
    expect(result.areaStatus.skills).toBe(true);
  });

  it('uses listLanguages data for languages completion', () => {
    const result = computeProfileCompletion(
      emptyInput({
        languages: [{ id: 'lang_1', language: 'Tamil', proficiency: 'NATIVE' } as never],
      }),
    );
    expect(result.areaStatus.languages).toBe(true);
  });

  it('marks education complete from education records', () => {
    expect(
      computeProfileCompletion(
        emptyInput({ education: [{ id: 'edu_1', institutionName: 'IIT' } as never] }),
      ).areaStatus.education,
    ).toBe(true);
  });

  it('marks experience complete from work experience records', () => {
    expect(
      computeProfileCompletion(
        emptyInput({ experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never] }),
      ).areaStatus.experience,
    ).toBe(true);
  });

  it('marks projects complete from project records', () => {
    expect(
      computeProfileCompletion(
        emptyInput({ projects: [{ projectId: 'prj_1', title: 'Portfolio' } as never] }),
      ).areaStatus.projects,
    ).toBe(true);
  });

  it('marks certifications complete from certificate records', () => {
    expect(
      computeProfileCompletion(
        emptyInput({ certificates: [{ certificateId: 'cert_1', title: 'PMP' } as never] }),
      ).areaStatus.certifications,
    ).toBe(true);
  });

  it('marks professional links complete with LinkedIn URL', () => {
    const result = computeProfileCompletion(
      emptyInput({
        onboardingProfile: { linkedinUrl: 'https://linkedin.com/in/ada' } as never,
      }),
    );
    expect(result.areaStatus.professionalLinks).toBe(true);
  });

  it('marks professional links complete with GitHub URL', () => {
    const result = computeProfileCompletion(
      emptyInput({
        onboardingDraft: { githubUrl: 'https://github.com/ada' },
      }),
    );
    expect(result.areaStatus.professionalLinks).toBe(true);
  });

  it('does not require social verification for professional links', () => {
    const result = computeProfileCompletion(
      emptyInput({
        onboardingProfile: {
          linkedinUrl: 'https://linkedin.com/in/ada',
          socialVerification: { linkedin: null, github: null },
        } as never,
      }),
    );
    expect(result.areaStatus.professionalLinks).toBe(true);
  });

  it('requires all three job preference fields', () => {
    expect(
      computeProfileCompletion(
        emptyInput({
          onboardingProfile: {
            jobPreferences: { expectedCtcLakhs: 8, currentLocation: 'Bengaluru' },
          } as never,
        }),
      ).areaStatus.jobPreferences,
    ).toBe(false);

    expect(
      computeProfileCompletion(
        emptyInput({
          onboardingProfile: {
            jobPreferences: {
              expectedCtcLakhs: 8,
              currentLocation: 'Bengaluru',
              preferredLocations: ['Bengaluru'],
            },
          } as never,
        }),
      ).areaStatus.jobPreferences,
    ).toBe(true);
  });

  it('does not change completion based on verification status', () => {
    const declared = computeProfileCompletion(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'DECLARED' } as never],
      }),
    );
    const verified = computeProfileCompletion(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
      }),
    );
    expect(declared.percent).toBe(verified.percent);
    expect(declared.areaStatus.skills).toBe(true);
    expect(verified.areaStatus.skills).toBe(true);
  });
});

describe('recommendNextAction', () => {
  it('recommends adding skills first when there are no skill claims', () => {
    const action = recommendNextAction(emptyInput());
    expect(action.id).toBe('add-skills');
    expect(action.href).toBe('/assessments');
  });

  it('prioritizes profile sections over verifying a DECLARED skill', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [
          {
            claimId: 'clm_react',
            skillCode: 'REACT',
            status: 'DECLARED',
          } as never,
        ],
      }),
    );
    expect(action.id).toBe('add-languages');
  });

  it('recommends verifying a DECLARED skill only after profile is complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [
          { claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never,
          {
            claimId: 'clm_react',
            skillCode: 'NODE',
            status: 'DECLARED',
          } as never,
        ],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never],
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
      }),
    );
    expect(action.id).toBe('verify-skill-clm_react');
    expect(action.href).toBe('/assessments/skills/clm_react');
  });

  it('recommends languages after skills are present', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
      }),
    );
    expect(action.id).toBe('add-languages');
  });

  it('recommends education after languages are complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
      }),
    );
    expect(action.id).toBe('add-education');
  });

  it('recommends experience after education is complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
      }),
    );
    expect(action.id).toBe('add-experience');
  });

  it('recommends projects after experience is complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never],
      }),
    );
    expect(action.id).toBe('add-project');
  });

  it('recommends certifications after projects are complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never],
        projects: [{ projectId: 'prj_1', title: 'App' } as never],
      }),
    );
    expect(action.id).toBe('add-certification');
  });

  it('recommends professional links after certifications are complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never],
        projects: [{ projectId: 'prj_1', title: 'App' } as never],
        certificates: [{ certificateId: 'cert_1', title: 'AWS' } as never],
      }),
    );
    expect(action.id).toBe('add-professional-links');
  });

  it('recommends job preferences after professional links are complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never],
        projects: [{ projectId: 'prj_1', title: 'App' } as never],
        certificates: [{ certificateId: 'cert_1', title: 'AWS' } as never],
        onboardingProfile: { linkedinUrl: 'https://linkedin.com/in/ada' } as never,
      }),
    );
    expect(action.id).toBe('add-job-preferences');
  });

  it('recommends public profile when everything is complete', () => {
    const action = recommendNextAction(
      emptyInput({
        skillClaims: [{ claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' } as never],
        languages: [{ id: 'lang_1', language: 'English', proficiency: 'FLUENT' } as never],
        education: [{ id: 'edu_1', institutionName: 'MIT' } as never],
        experiences: [{ id: 'exp_1', companyName: 'Acme', role: 'Dev' } as never],
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
      }),
    );
    expect(action.id).toBe('explore-public-profile');
    expect(action.href).toBe('/public-profile');
  });
});

describe('recommended action dismissal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T00:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the next profile action when the top recommendation was dismissed', () => {
    dismissRecommendedAction('add-skills');
    const visible = resolveVisibleRecommendedAction(emptyInput());
    expect(visible?.id).toBe('add-languages');
  });

  it('shows the action again after the 7-day TTL expires', () => {
    dismissRecommendedAction('add-skills');
    vi.setSystemTime(new Date(Date.now() + RECOMMENDED_ACTION_DISMISSAL_MS + 1));
    const visible = resolveVisibleRecommendedAction(emptyInput());
    expect(visible?.id).toBe('add-skills');
  });

  it('does not treat an expired dismissal as active', () => {
    dismissRecommendedAction('add-skills');
    expect(isRecommendedActionDismissed('add-skills')).toBe(true);
    vi.setSystemTime(new Date(Date.now() + RECOMMENDED_ACTION_DISMISSAL_MS + 1));
    expect(isRecommendedActionDismissed('add-skills')).toBe(false);
  });
});

describe('profileStrengthFromPercent', () => {
  it('maps percent bands to presentational strength labels', () => {
    expect(profileStrengthFromPercent(38).label).toBe('Getting started');
    expect(profileStrengthFromPercent(50).label).toBe('Building');
    expect(profileStrengthFromPercent(88).label).toBe('Strong');
    expect(profileStrengthFromPercent(100).label).toBe('Verification ready');
  });
});
