import { describe, expect, it } from 'vitest';
import { ResumeParseDraftSchema } from '@smart/contracts';
import {
  applyResumeDraft,
  applyServerDraft,
  buildCompleteOnboardingRequest,
  buildOnboardingDraftPayload,
  buildProfessionalLinksSavePayload,
  emptyOnboardingForm,
} from './onboarding-form';

describe('onboarding-form', () => {
  it('blocks completion when required fields are missing', () => {
    const result = buildCompleteOnboardingRequest(emptyOnboardingForm());
    expect(result).toEqual({ error: 'First and last name are required.' });
  });

  it('blocks completion when DPDP consent is declined', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.jobPreferences = {
      expectedCtcLakhs: '8',
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
    };
    form.dpdpConsent = false;
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'You must agree to the DPDP consent terms to complete your profile.',
    });
  });

  it('builds a complete payload with language skills and consent', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Native or Bilingual' }];
    form.jobPreferences = {
      expectedCtcLakhs: '8',
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
    };
    form.dpdpConsent = true;

    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.dpdpConsent).toBe(true);
    expect(result.interestDomain).toBe('CS_IT');
    expect(result.linkedinUrl).toBe('https://linkedin.com/in/ada');
    expect(result.education).toEqual([]);
    expect(result.experiences).toEqual([]);
    expect(result.skills).toEqual([
      { type: 'language', name: 'English', proficiency: 'Native or Bilingual' },
    ]);
    expect(result.jobPreferences).toEqual({
      expectedCtcLakhs: 8,
      currentCtcLakhs: undefined,
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
      preferredWorkModes: ['FULL_TIME', 'HYBRID'],
    });
  });

  it('normalizes professional links payload for profile save', () => {
    const form = emptyOnboardingForm();
    form.githubUrl = 'github.com/ada';
    form.linkedinUrl = 'linkedin.com/in/ada';
    const payload = buildProfessionalLinksSavePayload(form);
    expect(payload.githubUrl).toBe('https://github.com/ada');
    expect(payload.linkedinUrl).toBe('https://linkedin.com/in/ada');
  });

  it('leaves githubUrl optional and normalizes it like linkedinUrl when present', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.jobPreferences = {
      expectedCtcLakhs: '8',
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
    };
    form.dpdpConsent = true;

    const withoutGithub = buildCompleteOnboardingRequest(form);
    expect('error' in withoutGithub).toBe(false);
    if (!('error' in withoutGithub)) expect(withoutGithub.githubUrl).toBeUndefined();

    form.githubUrl = 'github.com/ada';
    const withGithub = buildCompleteOnboardingRequest(form);
    expect('error' in withGithub).toBe(false);
    if (!('error' in withGithub)) expect(withGithub.githubUrl).toBe('https://github.com/ada');
  });

  it('hydrates the form from a server-persisted draft', () => {
    const form = applyServerDraft(emptyOnboardingForm(), {
      firstName: 'Grace',
      lastName: 'Hopper',
      linkedinUrl: 'https://www.linkedin.com/in/grace',
      githubUrl: 'https://github.com/grace',
      skills: [{ type: 'language', name: 'English', proficiency: 'Native' }],
    });
    expect(form.firstName).toBe('Grace');
    expect(form.lastName).toBe('Hopper');
    expect(form.githubUrl).toBe('https://github.com/grace');
    expect(form.languages[0]?.language).toBe('English');
  });

  it('round-trips a draft payload through buildOnboardingDraftPayload', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.githubUrl = 'https://github.com/ada';
    const payload = buildOnboardingDraftPayload(form);
    expect(payload.firstName).toBe('Ada');
    expect(payload.githubUrl).toBe('https://github.com/ada');
    expect(payload.lastName).toBeUndefined();
  });

  it('pre-fills profile fields from a resume parse draft', () => {
    const draft = ResumeParseDraftSchema.parse({
      basicInfo: {
        firstName: 'Grace',
        lastName: 'Hopper',
        phoneNumber: '1112223333',
        linkedinUrl: 'https://www.linkedin.com/in/grace',
      },
      education: [],
      experiences: [],
      skills: [
        { type: 'technical', name: 'COBOL', proficiency: 'ADVANCED' },
        { type: 'language', name: 'English', proficiency: 'NATIVE' },
      ],
      licenses: [],
      parseConfidence: 0.9,
      missingFields: [],
    });
    const form = applyResumeDraft(emptyOnboardingForm(), draft);
    expect(form.firstName).toBe('Grace');
    expect(form.lastName).toBe('Hopper');
    expect(form.phoneNumber).toBe('1112223333');
    expect(form.languages[0]?.language).toBe('English');
    expect(form.codingProficiencies[0]?.language).toBe('COBOL');
  });

  it('requires job preferences (expected CTC, location, preferred locations)', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.dpdpConsent = true;

    expect(buildCompleteOnboardingRequest(form)).toEqual({ error: 'Expected CTC is required.' });

    form.jobPreferences.expectedCtcLakhs = '8';
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'Current location is required.',
    });

    form.jobPreferences.currentLocation = 'Bengaluru';
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'Pick at least one preferred location.',
    });

    form.jobPreferences.preferredLocations = ['Bengaluru'];
    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
  });

  it('merges catalog skills and framework picks into the flat skills payload', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.catalogSkills = { VERSION_CONTROL_CODE_COLLABORATION: 'INTERMEDIATE' };
    form.codingProficiencies = [{ id: 'a', language: 'Python', proficiency: 'ADVANCED' }];
    form.frameworkProficiencies = [{ id: 'b', framework: 'React', proficiency: 'BEGINNER' }];
    form.jobPreferences = {
      expectedCtcLakhs: '8',
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
    };
    form.dpdpConsent = true;

    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills).toEqual(
      expect.arrayContaining([
        { type: 'language', name: 'English', proficiency: 'Fluent' },
        {
          type: 'technical',
          name: 'Version Control & Code Collaboration',
          proficiency: 'INTERMEDIATE',
        },
        { type: 'technical', name: 'Python', proficiency: 'ADVANCED' },
        { type: 'technical', name: 'React', proficiency: 'BEGINNER' },
      ]),
    );
  });
});
