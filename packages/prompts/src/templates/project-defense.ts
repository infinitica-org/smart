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

export const PROJECT_DEFENSE_EXAMINER_PROMPT_REF = 'project-defense-examiner@1' as const;
export const PROJECT_DEFENSE_GRADER_PROMPT_REF = 'project-defense-grader@1' as const;

export const ProjectDefenseExaminerVariables = z.object({
  projectTitle: z.string().min(2),
  projectSummary: z.string().min(20),
  stack: z.string().min(1),
  declaredArtefacts: z.array(z.string()).max(30).default([]),
  verifyFlags: z.array(ProjectVerifyFlagSchema).max(10).default([]),
  verifyGaps: z.array(z.string().max(500)).max(10).default([]),
  snapshotDigest: z.string().max(16_000),
  qlixReportDigest: z.string().max(8_000).nullable().optional(),
  transcript: z
    .array(z.object({ role: z.enum(['EXAMINER', 'CANDIDATE']), text: z.string() }))
    .default([]),
  secondsRemaining: z.number().int().nonnegative(),
});

const ExaminerTurnSchema = z.object({
  question: z.string().min(10).max(1_000),
  probes: z.enum([
    'SKILLS_APPLICATION',
    'DEPTH',
    'OWNERSHIP',
    'TRADEOFFS',
    'FAILURE_MODES',
    'CLOSING',
  ]),
  isFinalTurn: z.boolean(),
});

const EXAMINER_SHAPE = `{
  "question": string,
  "probes": "SKILLS_APPLICATION" | "DEPTH" | "OWNERSHIP" | "TRADEOFFS" | "FAILURE_MODES" | "CLOSING",
  "isFinalTurn": boolean
}`;

export const projectDefenseExaminerTemplate: PromptTemplate<
  z.infer<typeof ProjectDefenseExaminerVariables>
> = {
  id: 'project-defense-examiner',
  version: 1,
  purpose: 'Conduct a project defense voice interview — verify claimed skills were applied.',
  modelRole: 'FAST_EXTRACTION',
  temperature: 0.4,
  maxOutputTokens: 512,
  outputSchema: ExaminerTurnSchema,
  variablesSchema: ProjectDefenseExaminerVariables,
  render: (variables) => ({
    system: [
      'You are a senior engineer conducting a project defense interview over voice.',
      'Your primary goal: verify whether the candidate actually applied the skills and concepts they claim in THIS specific project.',
      '',
      'Rules:',
      '- When transcript is empty, ask one opening question that names the project title and one declared stack skill — never a generic walk-through script.',
      '- Ask exactly one follow-up question per turn — short, spoken-friendly (under 30 words when possible).',
      '- Every question must tie to something concrete: the project title, stack, artefacts, verify flags, QLIX integrity findings, or their last answer.',
      '- Use QLIX integrity findings as factual probe hints only; do not treat them as proof of guilt or auto-reject. Live answers are the primary evidence.',
      '- Probe SKILLS_APPLICATION first: pick a technology from their declared stack and ask where/how they used it in this project.',
      '- Then probe DEPTH (implementation detail), OWNERSHIP (what they personally wrote), TRADEOFFS, and FAILURE_MODES.',
      '- Reference a specific detail from their last answer when possible — no generic textbook questions.',
      '- No preamble, praise, or feedback on the previous answer. One question only.',
      '- Set isFinalTurn true only after at least 3 candidate answers, when you have enough evidence on skills and ownership, or if the candidate clearly admits they did not build the project. Never set isFinalTurn on the first or second answer unless they deny ownership.',
      '- When closing (isFinalTurn true), ask a brief wrap-up question or thank them — still one sentence.',
      '',
      INJECTION_GUARD,
      jsonOnly(EXAMINER_SHAPE),
    ].join('\n'),
    user: [
      `PROJECT: ${variables.projectTitle}`,
      `DECLARED STACK: ${variables.stack}`,
      `SUMMARY: ${variables.projectSummary}`,
      variables.declaredArtefacts.length > 0
        ? `ARTEFACTS: ${variables.declaredArtefacts.join('; ')}`
        : '',
      variables.verifyFlags.length > 0 ? `FLAGS: ${variables.verifyFlags.join(', ')}` : '',
      variables.verifyGaps.length > 0 ? `GAPS: ${variables.verifyGaps.join('; ')}` : '',
      `DIGEST: ${untrusted(variables.snapshotDigest.slice(0, 8_000))}`,
      variables.qlixReportDigest?.trim()
        ? `QLIX_INTEGRITY: ${untrusted(variables.qlixReportDigest.slice(0, 8_000))}`
        : '',
      '',
      variables.transcript.map((t) => `${t.role}: ${t.text}`).join('\n\n'),
      '',
      `SECONDS REMAINING: ${String(variables.secondsRemaining)}`,
    ]
      .filter(Boolean)
      .join('\n'),
  }),
};

export const ProjectDefenseGraderVariables = z.object({
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
});

export const ProjectDefenseGradeOutputSchema = z.object({
  dimensions: z.object({
    depthOfUnderstanding: z.number().min(0).max(100),
    ownershipAndOriginality: z.number().min(0).max(100),
    defenseQuality: z.number().min(0).max(100),
  }),
  ownershipConcern: z.boolean(),
  ownershipConcernReason: z.string().max(1_000).nullable(),
  justification: z.string().min(20).max(2_000),
  evidence: z.array(z.string().max(500)).max(10),
});

const GRADER_SHAPE = `{
  "dimensions": { "depthOfUnderstanding": number, "ownershipAndOriginality": number, "defenseQuality": number },
  "ownershipConcern": boolean,
  "ownershipConcernReason": string | null,
  "justification": string,
  "evidence": string[]
}`;

export const projectDefenseGraderTemplate: PromptTemplate<
  z.infer<typeof ProjectDefenseGraderVariables>
> = {
  id: 'project-defense-grader',
  version: 1,
  purpose: 'Score a completed project defense — did the candidate demonstrate applied skills?',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: ProjectDefenseGradeOutputSchema,
  variablesSchema: ProjectDefenseGraderVariables,
  render: (variables) => ({
    system: [
      'Score a project defense interview for SMART project verification.',
      'Focus on whether the candidate demonstrated they applied the declared stack/skills in this specific project.',
      'depthOfUnderstanding: can they explain implementation details, not just buzzwords?',
      'ownershipAndOriginality: did they personally build what they claim?',
      'defenseQuality: were answers specific to this project, consistent, and credible under probing?',
      NO_TIER_AUTHORITY,
      NO_INFLATION,
      'Flag ownershipConcern only on positive evidence. Never auto-reject.',
      'Use QLIX integrity findings as contextual probe hints only; live interview answers are the primary evidence.',
      INJECTION_GUARD,
      jsonOnly(GRADER_SHAPE),
    ].join('\n'),
    user: [
      `PROJECT: ${variables.projectTitle}`,
      `DECLARED STACK: ${variables.stack}`,
      `SUMMARY: ${variables.projectSummary}`,
      variables.verifyFlags.length > 0 ? `FLAGS: ${variables.verifyFlags.join(', ')}` : '',
      variables.qlixReportDigest?.trim()
        ? `QLIX_INTEGRITY: ${untrusted(variables.qlixReportDigest.slice(0, 8_000))}`
        : '',
      untrusted(variables.transcript.map((t) => `${t.role}: ${t.text}`).join('\n\n')),
    ]
      .filter(Boolean)
      .join('\n'),
  }),
};
