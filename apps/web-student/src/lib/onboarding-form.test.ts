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

  it('omits academicProgram when study program and graduation year are blank', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    const payload = buildOnboardingDraftPayload(form);
    expect(payload.academicProgram).toBeUndefined();
  });

  it('includes only the filled academicProgram fields in the draft payload', () => {
    const form = emptyOnboardingForm();
    form.academicProgram = { studyProgram: 'B.Tech CSE', graduationYear: '' };
    const payload = buildOnboardingDraftPayload(form);
    expect(payload.academicProgram).toEqual({ studyProgram: 'B.Tech CSE' });
  });

  it('parses a valid graduation year into a number in the complete request', () => {
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
    form.academicProgram = { studyProgram: 'B.Tech CSE', graduationYear: '2026' };

    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.academicProgram).toEqual({ studyProgram: 'B.Tech CSE', graduationYear: 2026 });
  });

  it('hydrates academicProgram from a server-persisted draft', () => {
    const form = applyServerDraft(emptyOnboardingForm(), {
      academicProgram: { studyProgram: 'B.Tech CSE', graduationYear: 2026 },
      skills: [],
    });
    expect(form.academicProgram).toEqual({ studyProgram: 'B.Tech CSE', graduationYear: '2026' });
  });

  it('hydrates onboardingStep from a server-persisted draft (I212)', () => {
    const form = applyServerDraft(emptyOnboardingForm(), {
      onboardingStep: 'academics',
      skills: [],
    });
    expect(form.onboardingStep).toBe('academics');
  });

  it('includes a valid onboardingStep in the draft payload', () => {
    const form = emptyOnboardingForm();
    form.onboardingStep = 'languages';
    const payload = buildOnboardingDraftPayload(form);
    expect(payload.onboardingStep).toBe('languages');
  });

  it('omits an invalid/stale onboardingStep from the draft payload rather than sending garbage', () => {
    const form = emptyOnboardingForm();
    form.onboardingStep = 'not-a-real-step';
    const payload = buildOnboardingDraftPayload(form);
    expect(payload.onboardingStep).toBeUndefined();
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

  it('treats job preferences as optional during onboarding and includes them when filled', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.dpdpConsent = true;

    const without = buildCompleteOnboardingRequest(form);
    expect('error' in without).toBe(false);

    form.jobPreferences.expectedCtcLakhs = '8';
    form.jobPreferences.currentLocation = 'Bengaluru';
    form.jobPreferences.preferredLocations = ['Bengaluru'];
    const withPrefs = buildCompleteOnboardingRequest(form);
    expect('error' in withPrefs).toBe(false);
    expect(withPrefs).toEqual(
      expect.objectContaining({
        jobPreferences: expect.objectContaining({
          expectedCtcLakhs: 8,
          currentLocation: 'Bengaluru',
          preferredLocations: ['Bengaluru'],
        }),
      }),
    );
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
          name: 'Git & Version Control',
          proficiency: 'INTERMEDIATE',
        },
        { type: 'technical', name: 'Python', proficiency: 'ADVANCED' },
        { type: 'technical', name: 'React', proficiency: 'BEGINNER' },
      ]),
    );
  });
});
