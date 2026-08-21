import { z } from 'zod';
import {
  LevelFormatSchema,
  LevelNumberSchema,
  TierSchema,
  type LevelFormat,
  type LevelNumber,
} from './enums.js';

/**
 * The L1–L5 level model (ARCHITECTURE.md §6.1).
 *
 * Two axes define a result: LEVEL is cognitive depth, TIER is performance
 * quality. A candidate holds one tier per level, and the certificate headline
 * is the highest level cleared.
 *
 * Progression rule: a level unlocks only when the level below it was cleared at
 * BRONZE or above. Enforced by the assessment module (owner: Vishal Bharath R).
 */

export interface LevelDefinition {
  readonly level: LevelNumber;
  readonly code: `L${LevelNumber}`;
  /** Product-facing name. Used verbatim in the UI and on certificates. */
  readonly name: string;
  /** What this level actually measures — the one-line rationale. */
  readonly measures: string;
  readonly format: LevelFormat;
  /** Default wall-clock budget in minutes. Track overrides live in the DB. */
  readonly defaultDurationMinutes: number;
  /** True when scoring requires an LLM or human rater rather than a key. */
  readonly requiresRubricScoring: boolean;
  /** Execution mode of the scoring path (ARCHITECTURE.md §3.2). */
  readonly scoringMode: 'SYNCHRONOUS' | 'ASYNCHRONOUS';
}

export const LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  {
    level: 1,
    code: 'L1',
    name: 'Foundation Knowledge',
    measures: 'Recall and foundational understanding — can the candidate identify the right concept.',
    format: 'MCQ',
    defaultDurationMinutes: 100,
    requiresRubricScoring: false,
    scoringMode: 'SYNCHRONOUS',
  },
  {
    level: 2,
    code: 'L2',
    name: 'Applied Execution',
    measures: 'Doing — apply the concept in a realistic sandboxed or scenario task.',
    format: 'SANDBOX',
    defaultDurationMinutes: 90,
    requiresRubricScoring: true,
    scoringMode: 'ASYNCHRONOUS',
  },
  {
    level: 3,
    code: 'L3',
    name: 'Communication & Domain Judgment',
    measures: 'Explain and justify — trade-offs, failure modes, stakeholder communication.',
    format: 'AUDIO_BARS',
    defaultDurationMinutes: 45,
    requiresRubricScoring: true,
    scoringMode: 'ASYNCHRONOUS',
  },
  {
    level: 4,
    code: 'L4',
    name: 'Verification Defense',
    measures: 'Ownership and depth — defend submitted work under follow-up questioning.',
    format: 'DEFENSE',
    defaultDurationMinutes: 15,
    requiresRubricScoring: true,
    scoringMode: 'ASYNCHRONOUS',
  },
  {
    level: 5,
    code: 'L5',
    name: 'Capstone Project',
    measures: 'Integrative delivery — an end-to-end deliverable across all domains.',
    format: 'CAPSTONE',
    // 5–7 day window; expressed in minutes for a single consistent unit.
    defaultDurationMinutes: 7 * 24 * 60,
    requiresRubricScoring: true,
    scoringMode: 'ASYNCHRONOUS',
  },
] as const;

export function getLevelDefinition(level: LevelNumber): LevelDefinition {
  const found = LEVEL_DEFINITIONS.find((definition) => definition.level === level);
  if (!found) {
    throw new Error(`Unknown SMART level: ${String(level)}`);
  }
  return found;
}

/**
 * L5 capstone split scoring weights (ARCHITECTURE.md §6.1).
 * Owner of the implementation: Ramansh (evaluation module).
 */
export const L5_SPLIT_WEIGHTS = {
  objectiveChecklist: 0.5,
  practitionerRubric: 0.3,
  presentation: 0.2,
} as const;

/** The minimum tier that unlocks the next level. */
export const LEVEL_UNLOCK_MIN_TIER = 'BRONZE' as const;

export const LevelDefinitionSchema = z.object({
  level: LevelNumberSchema,
  code: z.string(),
  name: z.string(),
  measures: z.string(),
  format: LevelFormatSchema,
  defaultDurationMinutes: z.number().int().positive(),
  requiresRubricScoring: z.boolean(),
  scoringMode: z.enum(['SYNCHRONOUS', 'ASYNCHRONOUS']),
});

/**
 * Tier achieved at each level, keyed by level code — the "Tier Trail".
 * Serialised to `certificates.tier_trail_json`, e.g.
 *   { "L1": "GOLD", "L2": "GOLD", "L3": "SILVER" }
 */
export const TierTrailSchema = z.object({
  L1: TierSchema.optional(),
  L2: TierSchema.optional(),
  L3: TierSchema.optional(),
  L4: TierSchema.optional(),
  L5: TierSchema.optional(),
});
export type TierTrail = z.infer<typeof TierTrailSchema>;
