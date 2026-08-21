import { z } from 'zod';
import { BarsGradeSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import {
  INJECTION_GUARD,
  NO_INFLATION,
  NO_TIER_AUTHORITY,
  jsonOnly,
  untrusted,
} from '../shared.js';

/**
 * L4 project defense — the anti-plagiarism level.
 *
 * A candidate can copy a project. They cannot defend a project they did not
 * build. This is the only level whose purpose is to detect claimed-but-not-owned
 * work, so the examiner prompt is deliberately adversarial about *ownership*
 * while staying professional in tone.
 *
 * Owner: Ramansh.
 */

/* ---------------------------- examiner (live) ----------------------------- */

export const DefenseExaminerVariables = z.object({
  trackName: z.string().min(2),
  projectTitle: z.string().min(2),
  projectSummary: z.string().min(20),
  /** Stack/artefact facts extracted from the submission, used to probe specifics. */
  declaredArtefacts: z.array(z.string()).max(20).default([]),
  transcript: z
    .array(z.object({ role: z.enum(['EXAMINER', 'CANDIDATE']), text: z.string() }))
    .default([]),
  turnsRemaining: z.number().int().nonnegative(),
});
export type DefenseExaminerVariables = z.infer<typeof DefenseExaminerVariables>;

const ExaminerTurnSchema = z.object({
  question: z.string().min(10).max(1_000),
  /** What this question is testing, stored for the audit trail. */
  probes: z.enum(['DEPTH', 'OWNERSHIP', 'TRADEOFFS', 'FAILURE_MODES', 'CLOSING']),
  /** True when the examiner judges the defense complete. */
  isFinalTurn: z.boolean(),
});
export type ExaminerTurn = z.infer<typeof ExaminerTurnSchema>;

const EXAMINER_SHAPE = `{
  "question": string,      // one question, 10-1000 chars
  "probes": "DEPTH" | "OWNERSHIP" | "TRADEOFFS" | "FAILURE_MODES" | "CLOSING",
  "isFinalTurn": boolean
}`;

export const defenseExaminerTemplate: PromptTemplate<DefenseExaminerVariables> = {
  id: 'defense-examiner',
  version: 1,
  purpose: 'Ask the next L4 defense question, probing depth and genuine ownership.',
  modelRole: 'PRIMARY_REASONING',
  // The only prompt above zero: a scripted interrogation is easy to memorise and
  // share between candidates, which defeats the point of the level.
  temperature: 0.4,
  maxOutputTokens: 512,
  outputSchema: ExaminerTurnSchema,
  variablesSchema: DefenseExaminerVariables,
  render: (variables) => ({
    system: [
      `You are a senior ${variables.trackName} engineer conducting a short technical defense`,
      `of a candidate's own project. Ask exactly one question per turn.`,
      '',
      'WHAT YOU ARE TESTING',
      'Whether this person actually built this. Someone who did can explain a decision',
      'they made, something that broke, and what they would change. Someone who did not',
      'can describe the project but not the decisions inside it.',
      '',
      'HOW TO QUESTION',
      '- Ask about specific choices in THIS project, never generic theory.',
      '- Follow the thread: if an answer is vague, narrow it once before moving on.',
      '- Probe a failure or trade-off at least once — smooth-history projects are a signal.',
      '- Stay professional. You are assessing, not interrogating. No sarcasm, no traps.',
      '- One question. No preamble, no feedback on the previous answer.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(EXAMINER_SHAPE),
    ].join('\n'),
    user: [
      `PROJECT: ${variables.projectTitle}`,
      `SUMMARY: ${variables.projectSummary}`,
      variables.declaredArtefacts.length > 0
        ? `DECLARED ARTEFACTS: ${variables.declaredArtefacts.join(', ')}`
        : '',
      '',
      variables.transcript.length === 0
        ? 'This is the opening question. Start broad enough to let them talk, specific\nenough that a non-author cannot answer it.'
        : `TRANSCRIPT SO FAR\n${variables.transcript
            .map((turn) => `${turn.role}: ${turn.text}`)
            .join('\n\n')}`,
      '',
      `TURNS REMAINING AFTER THIS ONE: ${String(variables.turnsRemaining)}`,
      variables.turnsRemaining <= 1
        ? 'This is the closing turn. Set isFinalTurn to true.'
        : 'Ask your next question.',
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};

/* ----------------------------- grader (async) ----------------------------- */

export const DefenseGraderVariables = z.object({
  trackName: z.string().min(2),
  projectTitle: z.string().min(2),
  transcript: z.array(z.object({ role: z.enum(['EXAMINER', 'CANDIDATE']), text: z.string() })),
  rubric: z.object({
    depthOfUnderstanding: z.string().min(20),
    ownershipAndOriginality: z.string().min(20),
    defenseQuality: z.string().min(20),
  }),
  weights: z.object({
    depthOfUnderstanding: z.number(),
    ownershipAndOriginality: z.number(),
    defenseQuality: z.number(),
  }),
});
export type DefenseGraderVariables = z.infer<typeof DefenseGraderVariables>;

/**
 * Dimension scores, not a single number: the weights differ per track and the
 * weighted total is computed in `@smart/scoring-engine` so the arithmetic is
 * auditable rather than something a model did in its head.
 */
export const DefenseGradeSchema = BarsGradeSchema.extend({
  dimensions: z.object({
    depthOfUnderstanding: z.number().min(0).max(100),
    ownershipAndOriginality: z.number().min(0).max(100),
    defenseQuality: z.number().min(0).max(100),
  }),
  /**
   * Set when the transcript suggests the candidate cannot account for work they
   * claim. Routes to human review — it never auto-fails anyone, because a
   * nervous author and a non-author can look alike in one transcript.
   */
  ownershipConcern: z.boolean(),
  ownershipConcernReason: z.string().max(1_000).nullable(),
});
export type DefenseGrade = z.infer<typeof DefenseGradeSchema>;

const GRADER_SHAPE = `{
  "matchedAnchor": "GOLD" | "SILVER" | "BRONZE" | "BELOW_BRONZE",
  "barsScore": number,
  "confidence": number,
  "justification": string,
  "evidence": string[],
  "observedGaps": string[],
  "dimensions": {
    "depthOfUnderstanding": number,
    "ownershipAndOriginality": number,
    "defenseQuality": number
  },
  "ownershipConcern": boolean,
  "ownershipConcernReason": string | null
}`;

export const defenseGraderTemplate: PromptTemplate<DefenseGraderVariables> = {
  id: 'defense-grader',
  version: 1,
  purpose: 'Score a completed L4 defense transcript on the three rubric dimensions.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 3_072,
  outputSchema: DefenseGradeSchema,
  variablesSchema: DefenseGraderVariables,
  render: (variables) => ({
    system: [
      `You are a senior ${variables.trackName} practitioner scoring a completed project`,
      `defense transcript for the SMART readiness certification.`,
      '',
      NO_TIER_AUTHORITY,
      '',
      NO_INFLATION,
      '',
      'OWNERSHIP JUDGEMENT',
      'Flag ownershipConcern only on positive evidence: the candidate contradicts',
      'their own submission, cannot name a single decision they made, or describes',
      'the project only in the terms of its documentation. Nervousness, brevity and',
      'imperfect English are NOT ownership signals. A flag routes the attempt to a',
      'human reviewer; it does not fail anyone, so state your reason precisely.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(GRADER_SHAPE),
    ].join('\n'),
    user: [
      `PROJECT: ${variables.projectTitle}`,
      '',
      'RUBRIC',
      `Depth of understanding (weight ${variables.weights.depthOfUnderstanding.toFixed(2)}): ${variables.rubric.depthOfUnderstanding}`,
      `Ownership and originality (weight ${variables.weights.ownershipAndOriginality.toFixed(2)}): ${variables.rubric.ownershipAndOriginality}`,
      `Defense quality (weight ${variables.weights.defenseQuality.toFixed(2)}): ${variables.rubric.defenseQuality}`,
      '',
      'Score each dimension 0-100 independently. Do not compute the weighted total;',
      'that is done outside this call.',
      '',
      untrusted(variables.transcript.map((turn) => `${turn.role}: ${turn.text}`).join('\n\n')),
      '',
      'Score this defense now.',
    ].join('\n'),
  }),
};
