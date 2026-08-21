import { z } from 'zod';
import { JdThresholdVectorSchema, TRACK_CODES } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

/**
 * Job-description parsing for the placement overlay.
 *
 * Turns an employer's prose into a threshold vector: which track, and what
 * minimum tier at each level. That structure is what makes a match explainable
 * ("Gold at L1, Silver at L3, and the JD asked for Silver") instead of an
 * unaccountable similarity score, which is the difference between a TPO trusting
 * the shortlist and ignoring it.
 *
 * Owner: Ramansh (parse) / Vedika G (JD records and TPO correction flow).
 */

export const JdParseVariables = z.object({
  companyName: z.string().min(1),
  roleTitle: z.string().min(1),
  rawText: z.string().min(20),
  /** Track catalogue with the competencies each one certifies. */
  availableTracks: z
    .array(z.object({ code: z.string(), name: z.string(), summary: z.string() }))
    .min(1),
  levelNames: z.record(z.string(), z.string()),
});
export type JdParseVariables = z.infer<typeof JdParseVariables>;

const OUTPUT_SHAPE = `{
  "requiredTrack": string,              // one of the track codes listed below
  "minThresholds": { "L1": "GOLD" | "SILVER" | "BRONZE", ... },
  "emphasisedCompetencies": string[],   // <=20, phrased as the JD phrases them
  "parseConfidence": number             // 0-1
}`;

export const jdParseTemplate: PromptTemplate<JdParseVariables> = {
  id: 'jd-parse',
  version: 1,
  purpose: 'Convert an employer job description into a SMART track + tier threshold vector.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: JdThresholdVectorSchema,
  variablesSchema: JdParseVariables,
  render: (variables) => ({
    system: [
      'You map employer job descriptions onto the SMART certification model so that',
      'candidates can be matched on demonstrated competency rather than on keywords.',
      '',
      'HOW TO SET THRESHOLDS',
      '- Read what the role actually requires day to day, not the aspirational',
      '  wish-list paragraph every JD contains.',
      '- "Familiarity with" or "exposure to" maps to BRONZE. "Strong"/"solid"',
      '  maps to SILVER. "Expert"/"lead"/"own" maps to GOLD.',
      '- Years of experience are NOT a competency signal for graduate hiring. Ignore them.',
      '- Only include a level in minThresholds if the JD gives you a reason to.',
      '  An omitted level means "no minimum", which is honest; a guessed GOLD',
      '  silently excludes qualified candidates from the shortlist.',
      '',
      'CONFIDENCE',
      'Set parseConfidence below 0.6 whenever the JD is vague, spans multiple roles,',
      'or does not map cleanly onto one track. Low confidence sends the JD to a TPO',
      'for review, which is the correct outcome — do not inflate it to look decisive.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `COMPANY: ${variables.companyName}`,
      `ROLE TITLE: ${variables.roleTitle}`,
      '',
      'AVAILABLE TRACKS (requiredTrack must be exactly one of these codes)',
      variables.availableTracks
        .map((track) => `- ${track.code} — ${track.name}: ${track.summary}`)
        .join('\n'),
      '',
      'LEVELS',
      Object.entries(variables.levelNames)
        .map(([key, name]) => `- ${key}: ${name}`)
        .join('\n'),
      '',
      'JOB DESCRIPTION',
      untrusted(variables.rawText),
      '',
      'Produce the threshold vector.',
    ].join('\n'),
  }),
};

/** Track codes as the prompt caller should supply them. Exported for tests. */
export const KNOWN_TRACK_CODES: readonly string[] = TRACK_CODES;
