import { z } from 'zod';
import { WorkExperienceLetterAuthenticityExtractSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

export const WorkExperienceLetterAuthenticityVariables = z.object({
  rawText: z.string().min(1).max(80_000),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  claimedCompanyName: z.string().min(1).max(200),
});
export type WorkExperienceLetterAuthenticityVariables = z.infer<
  typeof WorkExperienceLetterAuthenticityVariables
>;

const OUTPUT_SHAPE = `{
  "candidateName": string | null,
  "companyName": string | null,
  "companyDomain": string | null,
  "hasLetterhead": boolean,
  "hasSignatureBlock": boolean,
  "confidence": number
}`;

export const workExperienceLetterAuthenticityTemplate: PromptTemplate<WorkExperienceLetterAuthenticityVariables> =
  {
    id: 'work-experience-letter-authenticity',
    version: 1,
    purpose:
      'Extract letter authenticity signals from work experience proof documents for heuristic review.',
    modelRole: 'PRIMARY_REASONING',
    temperature: 0,
    maxOutputTokens: 2_048,
    outputSchema: WorkExperienceLetterAuthenticityExtractSchema,
    variablesSchema: WorkExperienceLetterAuthenticityVariables,
    render: (variables) => ({
      system: [
        'You analyze uploaded employment letter text and extract authenticity signals only.',
        '',
        'RULES:',
        '- hasLetterhead: true when the document shows employer branding, logo, or formal letterhead layout.',
        '- hasSignatureBlock: true when an authorizing signature, signatory name/title, or signature line is present.',
        '- companyDomain: extract an official employer email or web domain if visible; null if absent.',
        '- Never invent names, companies, or domains.',
        '- confidence reflects OCR legibility and extraction certainty (0–1).',
        '',
        INJECTION_GUARD,
        '',
        jsonOnly(OUTPUT_SHAPE),
      ].join('\n'),
      user: [
        `CLAIMED EMPLOYER: ${variables.claimedCompanyName}`,
        `DOCUMENT FILE NAME: ${variables.fileName ?? 'Unknown'}`,
        `DOCUMENT MIME TYPE: ${variables.mimeType ?? 'Unknown'}`,
        '',
        'DOCUMENT TEXT:',
        untrusted(variables.rawText),
      ].join('\n'),
    }),
  };
