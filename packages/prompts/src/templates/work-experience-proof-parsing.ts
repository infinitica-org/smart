import { z } from 'zod';
import { WorkExperienceProofExtractedDataSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

export const WorkExperienceProofParseVariables = z.object({
  rawText: z.string().min(10).max(80_000),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});
export type WorkExperienceProofParseVariables = z.infer<typeof WorkExperienceProofParseVariables>;

const OUTPUT_SHAPE = `{
  "documentType": "OFFER_LETTER" | "EXPERIENCE_LETTER" | "PAYSLIP" | "RELIEVING_LETTER" | "FORM_16" | "OTHER",
  "isActualEmploymentProof": boolean,
  "candidateName": string | null,
  "companyName": string | null,
  "role": string | null,
  "startDate": string | null,
  "endDate": string | null,
  "confidence": number
}`;

export const workExperienceProofParseTemplate: PromptTemplate<WorkExperienceProofParseVariables> = {
  id: 'work-experience-proof-parse',
  version: 1,
  purpose:
    'Classify work experience proof document and extract candidate, employer, role, and date information.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 4_096,
  outputSchema: WorkExperienceProofExtractedDataSchema,
  variablesSchema: WorkExperienceProofParseVariables,
  render: (variables) => ({
    system: [
      'You analyze an uploaded work experience proof document text to classify its type and extract verified employment details.',
      '',
      'CLASSIFICATION RULES:',
      '- "OFFER_LETTER": Offer letter, appointment letter, employment intent, or job offer agreement. OFFER_LETTER is NOT actual employment proof (isActualEmploymentProof MUST be false).',
      '- "EXPERIENCE_LETTER": Service certificate, work experience certificate, or official completion letter issued by employer.',
      '- "RELIEVING_LETTER": Official exit or relieving certificate confirming completion of employment.',
      '- "PAYSLIP": Salary slip, pay stub, or wage disbursement statement.',
      '- "FORM_16": Official tax deduction/income certificate showing employer salary payments.',
      '- "OTHER": Any other document type.',
      '',
      'EXTRACTION RULES:',
      '- Set isActualEmploymentProof to true ONLY for EXPERIENCE_LETTER, RELIEVING_LETTER, PAYSLIP, or FORM_16 showing actual employment history/payments.',
      '- Set isActualEmploymentProof to false for OFFER_LETTER or documents indicating only an intent to hire.',
      '- Never invent candidate name, employer/company name, role, or dates.',
      '- Omit missing fields as null rather than guessing.',
      '- Dates should be normalized to YYYY-MM-DD, YYYY-MM, or YYYY if possible, or null if ambiguous.',
      '- confidence should be a number between 0 and 1.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `DOCUMENT FILE NAME: ${variables.fileName ?? 'Unknown'}`,
      `DOCUMENT MIME TYPE: ${variables.mimeType ?? 'Unknown'}`,
      '',
      'DOCUMENT TEXT CONTENT:',
      untrusted(variables.rawText),
      '',
      'Analyze and extract the work experience proof metadata.',
    ].join('\n'),
  }),
};
