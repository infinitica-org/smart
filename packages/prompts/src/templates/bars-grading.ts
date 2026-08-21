import { z } from 'zod';
import { BarsGradeSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import {
  INJECTION_GUARD,
  NO_INFLATION,
  NO_TIER_AUTHORITY,
  anchorBlock,
  jsonOnly,
  untrusted,
} from '../shared.js';

/**
 * L3 BARS grading — communication and applied written/spoken responses.
 *
 * This is the highest-volume AI prompt in the platform and the one whose drift
 * would do the most damage, since L3 is where "can explain their own work"
 * is decided.
 *
 * Owner: Ramansh. Anchor content is owned by Vedika G's calibration panel.
 */

const AnchorsSchema = z.object({
  GOLD: z.string().min(20),
  SILVER: z.string().min(20),
  BRONZE: z.string().min(20),
});

export const BarsL3Variables = z.object({
  trackName: z.string().min(2),
  competencyName: z.string().min(2),
  anchors: AnchorsSchema,
  /** Bumped by the panel; recorded on the grade for traceability. */
  anchorVersion: z.number().int().positive(),
  prompt: z.string().min(10),
  candidateResponse: z.string(),
  /** Transcript of a spoken answer, when the item was audio. */
  isTranscript: z.boolean().default(false),
  /** RAG context: reference material the panel attached to this competency. */
  referenceNotes: z.array(z.string()).max(10).default([]),
});
export type BarsL3Variables = z.infer<typeof BarsL3Variables>;

const OUTPUT_SHAPE = `{
  "matchedAnchor": "GOLD" | "SILVER" | "BRONZE" | "BELOW_BRONZE",
  "barsScore": number,            // 0-100, anchored to the scale below
  "confidence": number,           // 0-1, your confidence in the anchor match
  "justification": string,        // 20-4000 chars, cite the evidence you used
  "evidence": string[],           // <=10 short quotes from the response
  "observedGaps": string[]        // <=10 specific, actionable gaps
}`;

/**
 * Score anchoring.
 *
 * Without explicit numeric anchoring, models cluster everything between 70 and
 * 85, which destroys the variance the cut scores need in order to separate
 * tiers at all.
 */
const SCORE_SCALE = `
SCORE SCALE
- 85-100: meets or exceeds the GOLD anchor in full.
- 65-84:  meets the SILVER anchor; falls short of GOLD in a way you can name.
- 45-64:  meets the BRONZE anchor; the response is usable but thin.
- 20-44:  below the BRONZE anchor; recognisable attempt, material gaps.
- 0-19:   off-topic, empty, or no assessable content.
Use the full range. Most real responses are not in the 70s.`.trim();

export const barsL3Template: PromptTemplate<BarsL3Variables> = {
  id: 'bars-l3',
  version: 1,
  purpose: 'Grade an L3 communication/applied response against calibrated BARS anchors.',
  modelRole: 'PRIMARY_REASONING',
  // Zero temperature: two identical responses must receive the same grade, or
  // the inter-rater kappa we publish is measuring noise.
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: BarsGradeSchema,
  variablesSchema: BarsL3Variables,
  render: (variables) => ({
    system: [
      `You are an experienced ${variables.trackName} practitioner serving as an assessor on`,
      `the SMART readiness certification. You are grading one response against anchors written`,
      `by a panel of working practitioners in your field.`,
      '',
      NO_TIER_AUTHORITY,
      '',
      NO_INFLATION,
      '',
      SCORE_SCALE,
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `COMPETENCY: ${variables.competencyName}`,
      `TRACK: ${variables.trackName}`,
      `ANCHOR SET VERSION: ${String(variables.anchorVersion)}`,
      '',
      anchorBlock(variables.anchors),
      '',
      variables.referenceNotes.length > 0
        ? `PANEL REFERENCE NOTES (context, not a checklist)\n${variables.referenceNotes
            .map((note, index) => `${String(index + 1)}. ${note}`)
            .join('\n')}\n`
        : '',
      `TASK GIVEN TO THE CANDIDATE\n${variables.prompt}`,
      '',
      variables.isTranscript
        ? 'The following is an automatic transcript of a spoken answer. Ignore filler words,\nself-corrections and transcription artefacts; grade the substance only.\n'
        : '',
      untrusted(variables.candidateResponse),
      '',
      'Grade this response now.',
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};
