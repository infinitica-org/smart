import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_RESUME_FILES_MAX,
  CandidateResumeFilesSchema,
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
    expect(parsed.licenses).toEqual([]);
  });

  it('accepts a license or certification row', () => {
    const parsed = ResumeParseDraftSchema.parse({
      ...sampleDraft,
      licenses: [{ name: 'AWS Cloud Practitioner', issuer: 'Amazon' }],
    });
    expect(parsed.licenses).toHaveLength(1);
  });
});

describe('CandidateResumeFilesSchema', () => {
  it(`allows up to ${CANDIDATE_RESUME_FILES_MAX} stored files`, () => {
    const files = Array.from({ length: CANDIDATE_RESUME_FILES_MAX }, (_, index) => ({
      fileName: `cv-${index}.pdf`,
      objectKey: `resumes/u1/cv-${index}.pdf`,
      mimeType: 'application/pdf',
      fileSizeBytes: 1000,
      uploadedAt: '2026-09-12T10:00:00.000Z',
    }));
    expect(CandidateResumeFilesSchema.parse(files)).toHaveLength(CANDIDATE_RESUME_FILES_MAX);
    const duplicate = files[0];
    expect(duplicate).toBeDefined();
    expect(CandidateResumeFilesSchema.safeParse([...files, duplicate]).success).toBe(false);
  });
});

describe('ParseResumeResponseSchema', () => {
  it('allows FAILED with a null draft so the form stays manually editable', () => {
    const parsed = ParseResumeResponseSchema.parse({ status: 'FAILED', draft: null });
    expect(parsed.draft).toBeNull();
  });
});
