import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import { jsonOnly } from '../shared.js';

/**
 * Candidate gap report narrative.
 *
 * The scores and gaps are already computed deterministically by
 * `@smart/scoring-engine`; this prompt only turns them into something a
 * twenty-two-year-old will read and act on. It is given numbers and forbidden
 * from inventing new ones, so the narrative can never disagree with the
 * certificate.
 *
 * Owner: Ramansh (prompt) / Vishal Bharath R (student results surface).
 */

export const GapNarrativeVariables = z.object({
  trackName: z.string().min(2),
  /** Awarded tier, already decided by cut scores. The model must not revisit it. */
  awardedTier: z.enum(['GOLD', 'SILVER', 'BRONZE', 'BELOW_BRONZE']),
  levelName: z.string().min(2),
  rawScore: z.number().min(0).max(100),
  borderline: z.boolean(),
  pointsToNextTier: z.number().nullable(),
  strongestCompetencies: z.array(z.object({ name: z.string(), score: z.number() })).max(5),
  gapCompetencies: z.array(z.object({ name: z.string(), score: z.number() })).max(10),
  /** Evidence quotes captured by the grader, reused so advice stays concrete. */
  graderEvidence: z.array(z.string()).max(10).default([]),
});
export type GapNarrativeVariables = z.infer<typeof GapNarrativeVariables>;

export const GapNarrativeSchema = z.object({
  /** 2-3 sentences the candidate reads first. */
  summary: z.string().min(40).max(800),
  /** Concrete next actions, hardest-hitting first. */
  actions: z
    .array(
      z.object({
        competency: z.string(),
        action: z.string().min(20),
        whyItMatters: z.string().min(20),
      }),
    )
    .max(5),
  /** One line naming what they genuinely did well. Not filler praise. */
  strength: z.string().min(20).max(400),
});
export type GapNarrative = z.infer<typeof GapNarrativeSchema>;

const OUTPUT_SHAPE = `{
  "summary": string,
  "actions": [{ "competency": string, "action": string, "whyItMatters": string }],
  "strength": string
}`;

export const gapNarrativeTemplate: PromptTemplate<GapNarrativeVariables> = {
  id: 'gap-narrative',
  version: 1,
  purpose: 'Turn computed scores and gaps into a candidate-facing improvement plan.',
  modelRole: 'FAST_EXTRACTION',
  temperature: 0.2,
  maxOutputTokens: 1_536,
  outputSchema: GapNarrativeSchema,
  variablesSchema: GapNarrativeVariables,
  render: (variables) => ({
    system: [
      `You write the improvement plan a final-year student sees after a SMART`,
      `${variables.trackName} assessment. They are early in their career and this`,
      `result affects how they feel about their prospects. Be useful, not kind.`,
      '',
      'HARD RULES',
      '- The tier and the score are already decided. Never re-judge, question, or',
      '  re-explain them, and never state a different number than the ones given.',
      '- Do not invent gaps, scores, or evidence. Use only what is supplied.',
      '- Every action must be something they can start this week and finish. "Learn',
      '  system design" is useless; "rewrite your project README to explain why you',
      '  chose your database, in 200 words" is an action.',
      '- Name the gap plainly. Softening it into vagueness is the one thing that',
      '  actually harms them — they came here for a straight answer.',
      '- No motivational filler, no exclamation marks, no "journey", no "unlock".',
      '- Second person, plain English, short sentences.',
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `LEVEL: ${variables.levelName}`,
      `AWARDED TIER: ${variables.awardedTier}`,
      `SCORE: ${variables.rawScore.toFixed(2)} / 100`,
      variables.borderline
        ? 'This result is borderline — the cut-score confidence band overlaps the tier above. Mention this plainly once.'
        : '',
      variables.pointsToNextTier !== null
        ? `POINTS TO NEXT TIER: ${variables.pointsToNextTier.toFixed(2)}`
        : '',
      '',
      variables.strongestCompetencies.length > 0
        ? `STRONGEST\n${variables.strongestCompetencies
            .map((competency) => `- ${competency.name}: ${competency.score.toFixed(1)}`)
            .join('\n')}`
        : '',
      variables.gapCompetencies.length > 0
        ? `GAPS\n${variables.gapCompetencies
            .map((competency) => `- ${competency.name}: ${competency.score.toFixed(1)}`)
            .join('\n')}`
        : 'No competency fell below the gap threshold.',
      '',
      variables.graderEvidence.length > 0
        ? `WHAT THE ASSESSOR OBSERVED\n${variables.graderEvidence.map((line) => `- ${line}`).join('\n')}`
        : '',
      '',
      'Write the plan.',
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};
