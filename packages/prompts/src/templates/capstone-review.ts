import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import {
  INJECTION_GUARD,
  NO_INFLATION,
  NO_TIER_AUTHORITY,
  jsonOnly,
  untrusted,
} from '../shared.js';

/**
 * L5 capstone review — the practitioner-rubric 30 % of the capstone score.
 *
 * The other 70 % is deliberately NOT here: 50 % comes from an objective
 * checklist (does it build, do the tests pass, are the requirements met) and
 * 20 % from the presentation. Those are mechanical and human respectively.
 * Sending the whole capstone to a model would make the platform's most
 * consequential score the least auditable one.
 *
 * Owner: Ramansh.
 */

export const CapstoneReviewVariables = z.object({
  trackName: z.string().min(2),
  briefTitle: z.string().min(2),
  brief: z.string().min(20),
  /** Rubric lines written by the calibration panel for this brief. */
  rubricCriteria: z
    .array(z.object({ criterion: z.string(), whatGoodLooksLike: z.string() }))
    .min(1),
  /** Repo tree, README, and key excerpts assembled by the assessment module. */
  submissionDigest: z.string().min(20),
  /** Objective checklist results, so the model does not re-judge mechanical facts. */
  checklistResults: z
    .array(z.object({ check: z.string(), passed: z.boolean() }))
    .max(50)
    .default([]),
});
export type CapstoneReviewVariables = z.infer<typeof CapstoneReviewVariables>;

export const CapstoneReviewSchema = z.object({
  /** The practitioner-rubric component only, 0-100. */
  rubricScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  criterionScores: z
    .array(
      z.object({
        criterion: z.string(),
        score: z.number().min(0).max(100),
        justification: z.string().min(10).max(1_000),
      }),
    )
    .min(1),
  strengths: z.array(z.string()).max(10),
  observedGaps: z.array(z.string()).max(10),
  /** Reviewer-facing notes; never shown verbatim to the candidate. */
  reviewerNotes: z.string().max(2_000),
});
export type CapstoneReview = z.infer<typeof CapstoneReviewSchema>;

const OUTPUT_SHAPE = `{
  "rubricScore": number,          // 0-100, practitioner rubric component only
  "confidence": number,
  "criterionScores": [{ "criterion": string, "score": number, "justification": string }],
  "strengths": string[],
  "observedGaps": string[],
  "reviewerNotes": string
}`;

export const capstoneReviewTemplate: PromptTemplate<CapstoneReviewVariables> = {
  id: 'capstone-review',
  version: 1,
  purpose: 'Score the practitioner-rubric component (30%) of an L5 capstone submission.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 4_096,
  outputSchema: CapstoneReviewSchema,
  variablesSchema: CapstoneReviewVariables,
  render: (variables) => ({
    system: [
      `You are a senior ${variables.trackName} practitioner reviewing a capstone submission`,
      `for the SMART readiness certification.`,
      '',
      'SCOPE OF THIS REVIEW',
      'You are scoring ONE component: the practitioner rubric, worth 30% of the',
      'capstone. Whether the project builds and meets its stated requirements has',
      'already been checked mechanically and is given to you as fact — do not',
      're-judge it, and do not reward or penalise it again here. Judge craft:',
      'design decisions, appropriateness of approach, and whether a practitioner',
      'would be comfortable maintaining this.',
      '',
      NO_TIER_AUTHORITY,
      '',
      NO_INFLATION,
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `CAPSTONE BRIEF: ${variables.briefTitle}`,
      variables.brief,
      '',
      'RUBRIC CRITERIA',
      variables.rubricCriteria
        .map(
          (criterion, index) =>
            `${String(index + 1)}. ${criterion.criterion}\n   Good looks like: ${criterion.whatGoodLooksLike}`,
        )
        .join('\n'),
      '',
      variables.checklistResults.length > 0
        ? `OBJECTIVE CHECKLIST (already scored, given as fact)\n${variables.checklistResults
            .map((result) => `- [${result.passed ? 'PASS' : 'FAIL'}] ${result.check}`)
            .join('\n')}\n`
        : '',
      'SUBMISSION',
      untrusted(variables.submissionDigest),
      '',
      'Score every rubric criterion, then give the overall rubric score.',
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};
