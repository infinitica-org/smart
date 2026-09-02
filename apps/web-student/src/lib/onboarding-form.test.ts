import { describe, expect, it } from 'vitest';
import { ResumeParseDraftSchema } from '@smart/contracts';
import {
  applyResumeDraft,
  buildCompleteOnboardingRequest,
  emptyOnboardingForm,
  validateEducationItems,
  validateExperienceItems,
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
