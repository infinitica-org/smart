import { z } from 'zod';
import { PROJECT_VERIFY_PROMPT_REF, ProjectVerifyLlmOutputSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

export { PROJECT_VERIFY_PROMPT_REF };

export const ProjectVerifyVariables = z.object({
  title: z.string().min(3).max(200),
  problem: z.string().min(1).max(8_000),
  approach: z.string().min(1).max(8_000),
  stack: z.string().min(1).max(1_000),
  outcome: z.string().min(1).max(8_000),
  snapshotDigest: z.string().min(1).max(16_000),
});
export type ProjectVerifyVariables = z.infer<typeof ProjectVerifyVariables>;

const OUTPUT_SHAPE = `{
  "relevanceScore": number,
  "qualityScore": number,
  "confidence": number,
  "explanation": string,
  "evidence": string[],
  "gaps": string[]
}`;

export const projectVerifyTemplate: PromptTemplate<ProjectVerifyVariables> = {
  id: 'project-verify',
  version: 1,
  purpose: 'Score project relevance and quality from template text plus a GitHub snapshot digest.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 1_200,
  outputSchema: ProjectVerifyLlmOutputSchema,
  variablesSchema: ProjectVerifyVariables,
  render: (variables) => ({
    system: [
      'You score a SMART student project for relevance to the written brief and repo quality signals.',
      'This is not a certification tier. Do not say Gold, Silver, or Bronze.',
      'Never recommend rejecting the student. Low evidence means lower confidence.',
      '',
      'RULES',
      '- relevanceScore: how well problem/approach/stack/outcome match the repo digest.',
      '- qualityScore: structure, README, tests/CI signals, commit authenticity signals — not stars.',
      '- confidence: 0-1. Missing GitHub data must lower confidence.',
      '- explanation: plain language a reviewer can read. Min 20 characters.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `Title: ${variables.title}`,
      `Stack: ${variables.stack}`,
      'Problem:',
      untrusted(variables.problem),
      'Approach:',
      untrusted(variables.approach),
      'Outcome:',
      untrusted(variables.outcome),
      'GitHub snapshot digest:',
      untrusted(variables.snapshotDigest),
    ].join('\n'),
  }),
};
