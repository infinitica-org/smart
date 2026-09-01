import { describe, expect, it } from 'vitest';
import {
  ParseResumeRequestSchema,
  ParseResumeResponseSchema,
  ResumeParseDraftSchema,
} from './resume-parse.dto.js';

const sampleDraft = {
  basicInfo: { firstName: 'Asha', lastName: 'Iyer' },
  education: [{ institutionName: 'PSG College of Technology', degree: 'B.E.' }],
  experiences: [{ role: 'Intern', company: 'Infinitica' }],
  skills: [
    { type: 'technical' as const, name: 'Python', proficiency: 'INTERMEDIATE' as const },
    { type: 'language' as const, name: 'Tamil', proficiency: 'NATIVE' as const },
  ],
  parseConfidence: 0.82,
  missingFields: ['education.0.endDate'],
};

describe('ParseResumeRequestSchema', () => {
  it('accepts extracted resume text', () => {
    const parsed = ParseResumeRequestSchema.parse({
      rawText: 'A'.repeat(40),
    });
    expect(parsed.rawText?.length).toBe(40);
  });

  it('accepts an object key for a stored resume', () => {
    expect(() => ParseResumeRequestSchema.parse({ objectKey: 'resumes/u1/cv.pdf' })).not.toThrow();
  });

  it('rejects an empty body so we never spend tokens on nothing', () => {
    expect(ParseResumeRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('ResumeParseDraftSchema', () => {
  it('accepts a sparse but valid extract', () => {
    const parsed = ResumeParseDraftSchema.parse(sampleDraft);
    expect(parsed.skills).toHaveLength(2);
    expect(parsed.experiences[0]?.tags).toEqual([]);
  });

  it('rejects a verification-style proficiency on a language row', () => {
    const parsed = ResumeParseDraftSchema.safeParse({
      ...sampleDraft,
      skills: [{ type: 'language', name: 'English', proficiency: 'INTERMEDIATE' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('allows an empty draft when the resume has nothing extractable', () => {
    const parsed = ResumeParseDraftSchema.parse({ parseConfidence: 0.2 });
    expect(parsed.education).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });
});

describe('ParseResumeResponseSchema', () => {
  it('allows FAILED with a null draft so the form stays manually editable', () => {
    const parsed = ParseResumeResponseSchema.parse({ status: 'FAILED', draft: null });
    expect(parsed.draft).toBeNull();
  });
});
