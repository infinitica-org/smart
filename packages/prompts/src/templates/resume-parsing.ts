import { z } from 'zod';
import { ResumeParseDraftSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

/**
 * Onboarding resume parse (CN-T02 / #119).
 *
 * Extracts a pre-fill **draft**. The student always edits. Do not invent row ids,
 * verification flags, or catalog skill codes.
 *
 * Owner: Ramansh.
 */

export const ResumeParseVariables = z.object({
  rawText: z.string().min(40).max(80_000),
});
export type ResumeParseVariables = z.infer<typeof ResumeParseVariables>;

const OUTPUT_SHAPE = `{
  "basicInfo": { "firstName"?, "lastName"?, "phoneNumber"?, "phoneCountryCode"?, "linkedinUrl"?, "currentCollege"?, "summary"? },
  "education": [{ "institutionName", "degree"?, "fieldOfStudy"?, "startDate"?, "endDate"?, "current"?, "grade"? }],
  "experiences": [{ "role", "company", "location"?, "startDate"?, "endDate"?, "description"?, "tags"? }],
  "skills": [
    { "type": "technical", "name", "proficiency": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" },
    { "type": "language", "name", "proficiency": "NATIVE" | "FLUENT" | "CONVERSATIONAL" | "BASIC" }
  ],
  "parseConfidence": number,
  "missingFields": string[]
}`;

export const resumeParseTemplate: PromptTemplate<ResumeParseVariables> = {
  id: 'resume-parse',
  version: 1,
  purpose: 'Extract education, experience, and skills from resume text for onboarding pre-fill.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 4_096,
  outputSchema: ResumeParseDraftSchema,
  variablesSchema: ResumeParseVariables,
  render: (variables) => ({
    system: [
      'You extract structured profile fields from a resume so a student can review them.',
      'This is a draft for a form. Empty arrays are better than invented rows.',
      '',
      'RULES',
      '- Never invent employers, degrees, dates, or skills that are not in the text.',
      '- Never emit ids, verified flags, or catalog skill codes.',
      '- Omit a field rather than guess. List omitted dotted paths in missingFields.',
      '- Technical proficiency is BEGINNER, INTERMEDIATE, or ADVANCED only.',
      '- Language proficiency is NATIVE, FLUENT, CONVERSATIONAL, or BASIC only.',
      '- parseConfidence is 0-1. Use below 0.6 when the resume is sparse or ambiguous.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: ['RESUME TEXT', untrusted(variables.rawText), '', 'Extract the draft.'].join('\n'),
  }),
};
