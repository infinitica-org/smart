import { z } from 'zod';
import {
  COGNITIVE_PROFILE_BIO_DIGEST_MAX,
  COGNITIVE_PROFILE_PROMPT_REF,
  CognitiveCommLlmOutputSchema,
} from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

export { COGNITIVE_PROFILE_PROMPT_REF };

export const CognitiveCommProfileVariables = z.object({
  bioDigest: z.string().min(40).max(COGNITIVE_PROFILE_BIO_DIGEST_MAX),
  refreshReason: z.string().min(3).max(80),
});
export type CognitiveCommProfileVariables = z.infer<typeof CognitiveCommProfileVariables>;

const OUTPUT_SHAPE = `{
  "cognitiveNarrative": string,
  "communicationNarrative": string,
  "cognitiveStrengths": string[],
  "cognitiveWeaknesses": string[],
  "communicationStrengths": string[],
  "communicationWeaknesses": string[],
  "cognitiveScore"?: number,
  "communicationScore"?: number
}`;

export const cognitiveCommProfileTemplate: PromptTemplate<CognitiveCommProfileVariables> = {
  id: 'cognitive-comm-profile',
  version: 1,
  purpose:
    'Write a person-level cognitive and communication strengths/weaknesses narrative from onboarding context.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0.2,
  maxOutputTokens: 1_536,
  outputSchema: CognitiveCommLlmOutputSchema,
  variablesSchema: CognitiveCommProfileVariables,
  render: (variables) => ({
    system: [
      'You write a SMART cognitive and communication profile for a student.',
      'This is about how they think and how they communicate. It is not a skill grade.',
      '',
      'HARD RULES',
      '- Do not mention Gold, Silver, or Bronze. Do not award a certification tier.',
      '- Do not grade, verify, or rank any named skill claim.',
      '- Use only the bio digest. Do not invent employers, grades, or personal facts.',
      '- Both strengths and weaknesses arrays must be non-empty on each axis.',
      '- Narratives are 2-4 sentences. Weaknesses are specific and usable, not insults.',
      '- Optional scores are raw 0-100 signals, not tiers.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `Refresh reason: ${variables.refreshReason}`,
      'Bio digest (education, experience, preferences — not skill claims):',
      untrusted(variables.bioDigest),
    ].join('\n'),
  }),
};
