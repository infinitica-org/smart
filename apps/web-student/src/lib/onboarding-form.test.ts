import { describe, expect, it } from 'vitest';
import { ResumeParseDraftSchema } from '@smart/contracts';
import {
  applyResumeDraft,
  applyServerDraft,
  buildCompleteOnboardingRequest,
  buildOnboardingDraftPayload,
  emptyOnboardingForm,
} from './onboarding-form';

function minimalForm() {
  const form = emptyOnboardingForm();
  form.interestDomain = 'CS_IT';
  form.firstName = 'Ada';
  form.lastName = 'Lovelace';
  form.phoneCountryCode = '+91';
  form.phoneNumber = '9876543210';
  form.dpdpConsent = true;
  return form;
}

describe('onboarding-form', () => {
  it('blocks completion when interest domain is missing', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.dpdpConsent = true;

    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'Please select an area of interest.',
    });
  });

  it('blocks completion when required profile fields are missing', () => {
    const form = emptyOnboardingForm();
    form.interestDomain = 'FINANCE';

    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'First and last name are required.',
    });

    form.firstName = 'Ada';
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'First and last name are required.',
    });

    form.lastName = 'Lovelace';
    form.phoneCountryCode = '';
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'Phone country code is required.',
    });

    form.phoneCountryCode = '+91';
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'Phone number is required.',
    });

    form.phoneNumber = '123';
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'Mobile number must contain exactly 10 digits.',
    });
  });

  it('blocks completion when DPDP consent is declined', () => {
    const form = minimalForm();
    form.dpdpConsent = false;

    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'You must agree to the DPDP consent terms to enter SMART.',
    });
  });

  it('keeps profilePhotoUrl in local onboarding form state without blocking completion', () => {
    const form = minimalForm();
    form.profilePhotoUrl = 'https://cdn.example/photo.jpg';

    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    expect(form.profilePhotoUrl).toBe('https://cdn.example/photo.jpg');
  });

  it('builds the minimal completion payload', () => {
    const result = buildCompleteOnboardingRequest(minimalForm());
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result).toEqual({
      interestDomain: 'CS_IT',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      dpdpConsent: true,
    });
  });

  it('does not require job preferences for completion', () => {
    const form = minimalForm();
    expect(buildCompleteOnboardingRequest(form)).not.toHaveProperty('error');
  });

  it('does not require skills for completion', () => {
    const form = minimalForm();
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills).toEqual([{ type: 'language', name: 'English', proficiency: 'Fluent' }]);
  });

  it('does not require languages for completion', () => {
    const result = buildCompleteOnboardingRequest(minimalForm());
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skills).toBeUndefined();
  });

  it('does not require social information for completion', () => {
    const result = buildCompleteOnboardingRequest(minimalForm());
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.linkedinUrl).toBeUndefined();
    expect(result.githubUrl).toBeUndefined();
    expect(result.socialVerification).toBeUndefined();
  });

  it('does not require education or experience for completion', () => {
    const result = buildCompleteOnboardingRequest(minimalForm());
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.education).toBeUndefined();
    expect(result.experiences).toBeUndefined();
  });

  it('includes optional deferred fields when present without requiring them', () => {
    const form = minimalForm();
    form.linkedinUrl = 'linkedin.com/in/ada';
    form.githubUrl = 'github.com/ada';
    form.jobPreferences = {
      expectedCtcLakhs: '8',
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
    };
    form.catalogSkills = { GIT_VERSION_CONTROL: 'INTERMEDIATE' };

    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.linkedinUrl).toBe('https://linkedin.com/in/ada');
    expect(result.githubUrl).toBe('https://github.com/ada');
    expect(result.jobPreferences).toEqual({
      expectedCtcLakhs: 8,
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru'],
      preferredWorkModes: ['FULL_TIME', 'HYBRID'],
    });
    expect(result.skills).toEqual([
      { type: 'technical', name: 'Git & version control', proficiency: 'INTERMEDIATE' },
    ]);
  });

  it('hydrates interest domain from a server-persisted draft', () => {
    const form = applyServerDraft(emptyOnboardingForm(), {
      interestDomain: 'BUSINESS_MANAGEMENT',
      firstName: 'Grace',
      lastName: 'Hopper',
    });
    expect(form.interestDomain).toBe('BUSINESS_MANAGEMENT');
    expect(form.firstName).toBe('Grace');
    expect(form.lastName).toBe('Hopper');
  });

  it('round-trips interest domain through buildOnboardingDraftPayload', () => {
    const form = emptyOnboardingForm();
    form.interestDomain = 'FINANCE';
    form.firstName = 'Ada';
    const payload = buildOnboardingDraftPayload(form);
    expect(payload.interestDomain).toBe('FINANCE');
    expect(payload.firstName).toBe('Ada');
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
});
