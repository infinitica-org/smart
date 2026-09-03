import { describe, expect, it } from 'vitest';
import { ResumeParseDraftSchema } from '@smart/contracts';
import {
  applyResumeDraft,
  applyServerDraft,
  buildCompleteOnboardingRequest,
  buildOnboardingDraftPayload,
  emptyOnboardingForm,
  validateContractUrlField,
  validateEducationItems,
  validateExperienceItems,
  validatePhoneFields,
} from './onboarding-form';

function completeForm(
  overrides: Partial<ReturnType<typeof emptyOnboardingForm>> = {},
): ReturnType<typeof emptyOnboardingForm> {
  const form = emptyOnboardingForm();
  form.firstName = 'Ada';
  form.lastName = 'Lovelace';
  form.phoneNumber = '9876543210';
  form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
  form.preferences = ['Coding'];
  form.dpdpConsent = true;
  return { ...form, ...overrides };
}

describe('onboarding-form', () => {
  it('blocks completion when product-required language is missing', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.preferences = ['Coding'];
    form.dpdpConsent = true;
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'At least one language is required.',
    });
  });

  it('blocks completion when contract-required names are missing', () => {
    const form = completeForm({ firstName: '', lastName: '' });
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'First and last name are required.',
    });
  });

  it('allows an empty LinkedIn URL because the contract treats blank as valid', () => {
    const result = buildCompleteOnboardingRequest(completeForm({ linkedinUrl: '' }));
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.linkedinUrl).toBe('');
  });

  it('rejects invalid LinkedIn and GitHub URLs using the contract url union', () => {
    expect(buildCompleteOnboardingRequest(completeForm({ linkedinUrl: 'not a url' }))).toEqual({
      error: 'Enter a valid LinkedIn URL, or leave it blank.',
    });
    expect(buildCompleteOnboardingRequest(completeForm({ githubUrl: 'not a url' }))).toEqual({
      error: 'Enter a valid GitHub URL, or leave it blank.',
    });
  });

  it('rejects names and phone numbers that exceed contract max length', () => {
    expect(buildCompleteOnboardingRequest(completeForm({ firstName: 'A'.repeat(51) }))).toEqual({
      error: 'First name must be 50 characters or fewer.',
    });
    expect(buildCompleteOnboardingRequest(completeForm({ phoneNumber: '9'.repeat(33) }))).toEqual({
      error: 'Phone number must be 32 characters or fewer.',
    });
  });

  it('includes dateOfBirth when month, day, and year are set', () => {
    const result = buildCompleteOnboardingRequest(
      completeForm({ dobMonth: 'January', dobDay: '10', dobYear: '1990' }),
    );
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.dateOfBirth).toBe('1990-01-10');
  });

  it('validates optional URLs and phone at field boundaries', () => {
    expect(validateContractUrlField('', 'linkedinUrl')).toBeNull();
    expect(validateContractUrlField('linkedin.com/in/ada', 'linkedinUrl')).toBeNull();
    expect(validateContractUrlField('not a url', 'linkedinUrl')).toBe(
      'Enter a valid LinkedIn URL, or leave it blank.',
    );
    expect(validatePhoneFields(completeForm({ phoneNumber: '' }))).toBe(
      'Phone number is required.',
    );
    expect(validatePhoneFields(completeForm())).toBeNull();
  });

  it('blocks completion when DPDP consent is declined', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.preferences = ['Coding'];
    form.dpdpConsent = false;
    expect(buildCompleteOnboardingRequest(form)).toEqual({
      error: 'You must agree to the DPDP consent terms to complete your profile.',
    });
  });

  it('validates education entry institutionName is required', () => {
    const invalidEdu = [{ institutionName: '' }];
    expect(validateEducationItems(invalidEdu)).toBe(
      'Institution name is required for education entry #1.',
    );

    const validEdu = [{ institutionName: 'MIT', degree: 'B.Sc' }];
    expect(validateEducationItems(validEdu)).toBeNull();
  });

  it('validates experience entry role and company are required', () => {
    const invalidExpNoRole = [{ role: '', company: 'Acme Corp', tags: [] }];
    expect(validateExperienceItems(invalidExpNoRole)).toBe(
      'Role / Job Title is required for experience entry #1.',
    );

    const invalidExpNoCompany = [{ role: 'Engineer', company: '', tags: [] }];
    expect(validateExperienceItems(invalidExpNoCompany)).toBe(
      'Company name is required for experience entry #1.',
    );

    const validExp = [{ role: 'Developer', company: 'Acme', tags: [] }];
    expect(validateExperienceItems(validExp)).toBeNull();
  });

  it('builds a complete payload with education, experience, language skills, and consent', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Native or Bilingual' }];
    form.education = [
      { institutionName: 'University of Cambridge', degree: 'B.A.', fieldOfStudy: 'Mathematics' },
    ];
    form.experiences = [
      { role: 'Researcher', company: 'Analytical Engine Lab', location: 'London', tags: [] },
    ];
    form.preferences = ['Mathematics'];
    form.dpdpConsent = true;

    const result = buildCompleteOnboardingRequest(form);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.dpdpConsent).toBe(true);
    expect(result.linkedinUrl).toBe('https://linkedin.com/in/ada');
    expect(result.education).toHaveLength(1);
    expect(result.education[0]?.institutionName).toBe('University of Cambridge');
    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0]?.company).toBe('Analytical Engine Lab');
    expect(result.skills).toEqual([
      { type: 'language', name: 'English', proficiency: 'Native or Bilingual' },
    ]);
  });

  it('leaves githubUrl optional and normalizes it like linkedinUrl when present', () => {
    const form = emptyOnboardingForm();
    form.firstName = 'Ada';
    form.lastName = 'Lovelace';
    form.phoneNumber = '9876543210';
    form.linkedinUrl = 'https://www.linkedin.com/in/ada';
    form.languages = [{ id: '1', language: 'English', proficiency: 'Fluent' }];
    form.preferences = ['Coding'];
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
      education: [{ institutionName: 'Yale' }],
    });
    expect(form.firstName).toBe('Grace');
    expect(form.lastName).toBe('Hopper');
    expect(form.githubUrl).toBe('https://github.com/grace');
    expect(form.languages[0]?.language).toBe('English');
    expect(form.education[0]?.institutionName).toBe('Yale');
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
      education: [{ institutionName: 'Yale' }],
      experiences: [{ role: 'Admiral', company: 'USN', tags: [] }],
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
    expect(form.education[0]?.institutionName).toBe('Yale');
  });
});
