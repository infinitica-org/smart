import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import { jsonOnly } from '../shared.js';

/**
 * Item-authoring assistance for the content pipeline.
 *
 * IMPORTANT: this drafts *candidate* items for human review. Nothing produced
 * here enters the live item bank without a practitioner approving it and the
 * calibration panel setting its cut score. An AI-generated question with an
 * AI-generated answer key and no human sign-off is exactly the "AI slop
 * assessment" SMART is positioned against.
 *
 * Owner: Ramansh (prompt) / Vedika G (item bank, review workflow, approval).
 */

export const ItemDraftVariables = z.object({
  trackName: z.string().min(2),
  competencyName: z.string().min(2),
  competencyDescription: z.string().min(10),
  levelNumber: z.number().int().min(1).max(5),
  itemType: z.enum(['MCQ', 'NUMERIC', 'SHORT_TEXT', 'CODE', 'AUDIO_RESPONSE', 'ARTEFACT']),
  count: z.number().int().min(1).max(10),
  /** Existing stems, so drafts do not duplicate the bank. */
  existingStems: z.array(z.string()).max(50).default([]),
  /** Source material the pipeline retrieved for grounding. */
  sourceExcerpts: z.array(z.string()).max(10).default([]),
});
export type ItemDraftVariables = z.infer<typeof ItemDraftVariables>;

export const ItemDraftSchema = z.object({
  drafts: z
    .array(
      z.object({
        stem: z.string().min(10),
        itemType: z.string(),
        options: z
          .array(z.object({ label: z.string(), text: z.string(), isCorrect: z.boolean() }))
          .max(6)
          .optional(),
        expectedAnswer: z.string().optional(),
        /** Why each wrong option is plausible — the reviewer's main check. */
        distractorRationale: z.array(z.string()).max(6).default([]),
        /** Author's difficulty guess. Advisory only; the panel sets the real one. */
        estimatedDifficulty: z.enum(['EASY', 'MODERATE', 'HARD']),
        /** What a practitioner would actually use this for. */
        realWorldContext: z.string().min(10),
        reviewerFlags: z.array(z.string()).max(5).default([]),
      }),
    )
    .min(1),
});
export type ItemDraft = z.infer<typeof ItemDraftSchema>;

const OUTPUT_SHAPE = `{
  "drafts": [{
    "stem": string,
    "itemType": string,
    "options": [{ "label": string, "text": string, "isCorrect": boolean }],  // MCQ only
    "expectedAnswer": string,                                               // non-MCQ
    "distractorRationale": string[],
    "estimatedDifficulty": "EASY" | "MODERATE" | "HARD",
    "realWorldContext": string,
    "reviewerFlags": string[]
  }]
}`;

export const itemDraftTemplate: PromptTemplate<ItemDraftVariables> = {
  id: 'item-draft',
  version: 1,
  purpose: 'Draft candidate assessment items for practitioner review. Never auto-published.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0.3,
  maxOutputTokens: 8_192,
  outputSchema: ItemDraftSchema,
  variablesSchema: ItemDraftVariables,
  render: (variables) => ({
    system: [
      `You draft assessment items for the SMART readiness certification in the`,
      `${variables.trackName} track. A working practitioner reviews everything you`,
      `write before it is used, and a calibration panel sets its difficulty. Your job`,
      `is to give them good raw material and to tell them where you are unsure.`,
      '',
      'WHAT MAKES A USABLE ITEM',
      '- It tests something the role actually does. If the answer is only useful for',
      '  passing a test, the item is worthless.',
      '- It is decidable: exactly one defensible answer, or a clearly bounded expectation.',
      '- Distractors are plausible mistakes a real learner makes, not filler. State',
      '  the mistake each distractor represents in distractorRationale.',
      '- It is not answerable by pattern-matching the wording of the stem.',
      '- It does not depend on trivia, version-specific syntax, or memorised constants.',
      '',
      'BE HONEST ABOUT DOUBT',
      'Use reviewerFlags to say what you are unsure about: ambiguous phrasing, a',
      'debatable answer key, possible overlap with an existing item, or a topic where',
      'you may be out of date. A flagged draft is useful; a confidently wrong one',
      'wastes a reviewer and can reach a candidate.',
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `COMPETENCY: ${variables.competencyName}`,
      `DESCRIPTION: ${variables.competencyDescription}`,
      `LEVEL: L${String(variables.levelNumber)}`,
      `ITEM TYPE: ${variables.itemType}`,
      `HOW MANY: ${String(variables.count)}`,
      '',
      variables.sourceExcerpts.length > 0
        ? `GROUND YOUR ITEMS IN THIS SOURCE MATERIAL\n${variables.sourceExcerpts
            .map((excerpt, index) => `[${String(index + 1)}] ${excerpt}`)
            .join('\n')}\n`
        : '',
      variables.existingStems.length > 0
        ? `ALREADY IN THE BANK — do not duplicate or lightly reword these\n${variables.existingStems
            .map((stem) => `- ${stem}`)
            .join('\n')}\n`
        : '',
      `Draft ${String(variables.count)} item(s).`,
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};
