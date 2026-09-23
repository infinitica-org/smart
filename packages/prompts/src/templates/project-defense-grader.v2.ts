import { z } from 'zod';
import { ProjectVerifyFlagSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import {
  INJECTION_GUARD,
  NO_INFLATION,
  NO_TIER_AUTHORITY,
  jsonOnly,
  untrusted,
} from '../shared.js';

export const PROJECT_DEFENSE_GRADER_V2_PROMPT_REF = 'project-defense-grader@2' as const;

export const ProjectDefenseGraderV2Variables = z.object({
  projectTitle: z.string().min(2),
  projectSummary: z.string().min(20),
  stack: z.string().min(1),
  verifyFlags: z.array(ProjectVerifyFlagSchema).max(10).default([]),
  qlixReportDigest: z.string().max(8_000).nullable().optional(),
  transcript: z.array(z.object({ role: z.enum(['EXAMINER', 'CANDIDATE']), text: z.string() })),
  weights: z.object({
    depthOfUnderstanding: z.number(),
    ownershipAndOriginality: z.number(),
    defenseQuality: z.number(),
  }),
  competencies: z
    .array(
      z.object({
        competencyId: z.string().min(1).max(80),
        capability: z.string().min(2).max(300),
      }),
    )
    .max(20)
    .default([]),
});

export const ProjectDefenseGradeOutputV2Schema = z.object({
  dimensions: z.object({
    depthOfUnderstanding: z.number().min(0).max(100),
    ownershipAndOriginality: z.number().min(0).max(100),
    defenseQuality: z.number().min(0).max(100),
  }),
  ownershipConcern: z.boolean(),
  ownershipConcernReason: z.string().max(1_000).nullable(),
  justification: z.string().min(20).max(2_000),
  demonstratedClaims: z.array(z.string().max(500)).max(15),
  inferredClaims: z.array(z.string().max(500)).max(15),
  competencyScores: z
    .array(
      z.object({
        competencyId: z.string().min(1).max(80),
        score: z.number().min(0).max(100),
        status: z.enum(['DEMONSTRATED', 'PARTIALLY_DEMONSTRATED', 'NOT_DEMONSTRATED', 'UNCERTAIN']),
      }),
    )
    .max(20),
});

const GRADER_V2_SHAPE = `{
  "dimensions": { "depthOfUnderstanding": number, "ownershipAndOriginality": number, "defenseQuality": number },
  "ownershipConcern": boolean,
  "ownershipConcernReason": string | null,
  "justification": string,
  "demonstratedClaims": string[],
  "inferredClaims": string[],
  "competencyScores": [{ "competencyId": string, "score": number, "status": "DEMONSTRATED" | "PARTIALLY_DEMONSTRATED" | "NOT_DEMONSTRATED" | "UNCERTAIN" }]
}`;

export const projectDefenseGraderV2Template: PromptTemplate<
  z.infer<typeof ProjectDefenseGraderV2Variables>
> = {
  id: 'project-defense-grader',
  version: 2,
  purpose: 'Score project defense with competency rubric and demonstrated vs inferred claims.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: ProjectDefenseGradeOutputV2Schema,
  variablesSchema: ProjectDefenseGraderV2Variables,
  render: (variables) => ({
    system: [
      'Score a project defense interview for SMART project verification.',
      'depthOfUnderstanding, ownershipAndOriginality, defenseQuality: same as v1 rubric.',
      'demonstratedClaims: only statements directly supported by candidate quotes in the transcript.',
      'inferredClaims: reasonable hypotheses NOT explicitly stated — never treat as demonstrated.',
      'competencyScores: score each listed competency from the blueprint using transcript evidence only.',
      NO_TIER_AUTHORITY,
      NO_INFLATION,
      'Flag ownershipConcern only on positive evidence. Never auto-reject.',
      INJECTION_GUARD,
      jsonOnly(GRADER_V2_SHAPE),
    ].join('\n'),
    user: [
      `PROJECT: ${variables.projectTitle}`,
      `STACK: ${variables.stack}`,
      `SUMMARY: ${variables.projectSummary}`,
      variables.verifyFlags.length > 0 ? `FLAGS: ${variables.verifyFlags.join(', ')}` : '',
      variables.qlixReportDigest?.trim()
        ? `QLIX_INTEGRITY: ${untrusted(variables.qlixReportDigest.slice(0, 8_000))}`
        : '',
      variables.competencies.length > 0
        ? `COMPETENCIES:\n${variables.competencies.map((c) => `- ${c.competencyId}: ${c.capability}`).join('\n')}`
        : '',
      untrusted(variables.transcript.map((t) => `${t.role}: ${t.text}`).join('\n\n')),
    ]
      .filter(Boolean)
      .join('\n'),
  }),
};
