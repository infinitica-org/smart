import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly } from '../shared.js';

export const MATCH_NARRATIVE_PROMPT_REF = 'match-narrative@1' as const;

export const MatchNarrativeVariables = z.object({
  roleTitle: z.string().min(1),
  companyName: z.string().min(1),
  matchFactsJson: z.string().min(10).max(16_000),
});
export type MatchNarrativeVariables = z.infer<typeof MatchNarrativeVariables>;

export const MatchNarrativeOutputSchema = z.object({
  recruiterSummary: z.string().min(20).max(500),
  studentSummary: z.string().min(20).max(500),
});

const OUTPUT_SHAPE = `{
  "recruiterSummary": string,
  "studentSummary": string
}`;

export const matchNarrativeTemplate: PromptTemplate<MatchNarrativeVariables> = {
  id: 'match-narrative',
  version: 1,
  purpose: 'Turn structured match facts into recruiter and student-facing summaries.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 1_024,
  outputSchema: MatchNarrativeOutputSchema,
  variablesSchema: MatchNarrativeVariables,
  render: (variables) => ({
    system: [
      'Write concise placement fit summaries from structured match facts only.',
      'Do NOT mention skills, capabilities, or evidence not present in the input JSON.',
      'Do NOT invent proficiency levels or project evidence.',
      'recruiterSummary: neutral, defensible tone for a TPO presenting to an employer.',
      'studentSummary: constructive coaching tone highlighting gaps as next steps.',
      INJECTION_GUARD,
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `ROLE: ${variables.roleTitle} at ${variables.companyName}`,
      '',
      'MATCH FACTS (only cite what appears here)',
      variables.matchFactsJson,
    ].join('\n'),
  }),
};
