import { describe, expect, it } from 'vitest';
import {
  CandidateEducationSchema,
  CandidateLanguageSchema,
  CreateCandidateEducationSchema,
  CreateCandidateLanguageSchema,
  RejectCandidateEducationSchema,
} from './candidate-profile.dto.js';

describe('Candidate Education & Language DTO Schemas', () => {
  it('validates a valid CreateCandidateEducation payload', () => {
    const valid = {
      institutionName: 'Stanford University',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2020-09-01',
      endDate: '2024-06-01',
      current: false,
      grade: '3.9 GPA',
    };
    const parsed = CreateCandidateEducationSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects CreateCandidateEducation payload without institutionName', () => {
    const invalid = {
      institutionName: '',
      degree: 'B.S.',
    };
    const parsed = CreateCandidateEducationSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates a full CandidateEducation item schema with status', () => {
    const fullItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      institutionName: 'MIT',
      degree: 'Master of Engineering',
      fieldOfStudy: 'AI',
      startDate: '2022-09-01',
      endDate: null,
      current: true,
      grade: 'A',
      status: 'verified',
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = CandidateEducationSchema.safeParse(fullItem);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('verified');
    }
  });

  it('validates RejectCandidateEducationSchema with mandatory non-empty reason', () => {
    const valid = { reason: 'Incorrect degree documents uploaded.' };
    expect(RejectCandidateEducationSchema.safeParse(valid).success).toBe(true);

    const invalidEmpty = { reason: '' };
    expect(RejectCandidateEducationSchema.safeParse(invalidEmpty).success).toBe(false);
  });

  it('validates CreateCandidateLanguage schema', () => {
    const valid = {
      language: 'English',
      proficiency: 'Full Professional',
    };
    const parsed = CreateCandidateLanguageSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects CreateCandidateLanguage with missing fields', () => {
    const invalid = {
      language: '',
      proficiency: '',
    };
    const parsed = CreateCandidateLanguageSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates full CandidateLanguage schema', () => {
    const fullItem = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      language: 'Spanish',
      proficiency: 'Native',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = CandidateLanguageSchema.safeParse(fullItem);
    expect(parsed.success).toBe(true);
  });
});
