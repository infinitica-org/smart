import { z } from 'zod';
import {
  CalibrationStatusSchema,
  DifficultyTagSchema,
  DomainCodeSchema,
  ItemTypeSchema,
  LevelFormatSchema,
  TrackCategorySchema,
  TrackCodeSchema,
  TrackLaunchStatusSchema,
} from '../domain/enums.js';
import { LevelNumberSchema } from '../domain/enums.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema, WeightSchema } from './common.js';

/**
 * Catalog contracts — tracks, competencies, levels and item delivery.
 * Implementation owner: Vedika G (`apps/api-core/src/modules/catalog`).
 *
 * IMPORTANT for `assessment` (Vishal Bharath R): item delivery goes through
 * `AssignedFormDto` only. Never query the item bank directly — parallel-form
 * rotation, exposure tracking and item retirement are the anti-cheat mechanism
 * and they live behind this contract.
 */

export const CompetencyDtoSchema = z.object({
  competencyId: UuidSchema,
  trackCode: TrackCodeSchema,
  domainCode: DomainCodeSchema,
  name: z.string(),
  subDomain: z.string(),
  /** `real_world_weight` — contribution to the track score. Sums to 1.0 per track. */
  realWorldWeight: WeightSchema,
  assessedAtLevels: z.array(LevelNumberSchema),
});
export type CompetencyDto = z.infer<typeof CompetencyDtoSchema>;

export const LevelDtoSchema = z.object({
  levelId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  name: z.string(),
  format: LevelFormatSchema,
  durationMinutes: z.number().int().positive(),
  itemCount: z.number().int().nonnegative(),
  /** Whether cut scores have been published for this level. */
  cutScoresPublished: z.boolean(),
});
export type LevelDto = z.infer<typeof LevelDtoSchema>;

export const TrackDtoSchema = z.object({
  trackId: UuidSchema,
  code: TrackCodeSchema,
  name: z.string(),
  category: TrackCategorySchema,
  launchStatus: TrackLaunchStatusSchema,
  calibrationStatus: CalibrationStatusSchema,
  foundationWeight: WeightSchema,
  competencies: z.array(CompetencyDtoSchema),
  levels: z.array(LevelDtoSchema),
  capstoneBrief: z.string(),
});
export type TrackDto = z.infer<typeof TrackDtoSchema>;

/* ------------------------------ item delivery ----------------------------- */

/** MCQ option as delivered to the candidate. Correctness is never sent. */
export const ItemOptionSchema = z.object({
  optionId: z.string(),
  label: z.string(),
});
export type ItemOption = z.infer<typeof ItemOptionSchema>;

/**
 * An item as delivered to the assessment player.
 *
 * SECURITY: this shape deliberately omits `modelAnswer`, `correctOptionIds` and
 * `barsAnchors`. Adding any of those here would leak the answer key to the
 * browser. If you need them server-side, use `ItemInternalDto`.
 */
export const DeliverableItemDtoSchema = z.object({
  itemId: UuidSchema,
  competencyId: UuidSchema,
  domainCode: DomainCodeSchema,
  itemType: ItemTypeSchema,
  difficulty: DifficultyTagSchema,
  promptText: z.string(),
  /** Present for MCQ item types only. */
  options: z.array(ItemOptionSchema).optional(),
  /** Present for CODE_TASK / SQL_TASK — starter code and the runtime to use. */
  starterCode: z.string().optional(),
  runtime: z.enum(['node', 'python', 'postgres']).optional(),
  /** Present for SPOKEN_RESPONSE / DEFENSE_PROMPT. */
  maxResponseSeconds: z.number().int().positive().optional(),
  /** Attachment (dataset, diagram, JD) served from R2 via a signed URL. */
  attachmentUrl: z.url().optional(),
  /** Weight of this item inside the level score. */
  itemWeight: WeightSchema,
});
export type DeliverableItemDto = z.infer<typeof DeliverableItemDtoSchema>;

/** Server-side view including the answer key. Never serialised to a client. */
export const ItemInternalDtoSchema = DeliverableItemDtoSchema.extend({
  correctOptionIds: z.array(z.string()).optional(),
  expectedNumericAnswer: z.number().optional(),
  numericTolerance: z.number().optional(),
  modelAnswer: z.string().optional(),
  checklistCriteria: z
    .array(z.object({ id: z.string(), text: z.string(), points: z.number() }))
    .optional(),
  sandboxTestCases: z
    .array(
      z.object({
        id: z.string(),
        input: z.string(),
        expectedOutput: z.string(),
        hidden: z.boolean(),
      }),
    )
    .optional(),
  activeFlag: z.boolean(),
  exposureCount: z.number().int().nonnegative(),
});
export type ItemInternalDto = z.infer<typeof ItemInternalDtoSchema>;

/**
 * A parallel form assigned to one attempt.
 *
 * Anti-cheat: no two students in the same cohort window receive the same
 * `formId`, and items whose `exposureCount` crosses the retirement threshold are
 * rotated out each cycle.
 */
export const AssignedFormDtoSchema = z.object({
  formId: z.string(),
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  cohortWindow: z.string(),
  itemIds: z.array(UuidSchema),
  totalWeight: z.number(),
  maxRawScore: ScoreSchema,
  generatedAt: IsoDateTimeSchema,
});
export type AssignedFormDto = z.infer<typeof AssignedFormDtoSchema>;

/* ---------------------------- content readiness ---------------------------- */

/**
 * Output of `pnpm content report` and of `GET /catalog/readiness`.
 * This is the signal the team plans against at the twice-weekly Content Sync —
 * it makes item-bank readiness visible as a delivery risk, not a content chore.
 */
export const TrackReadinessDtoSchema = z.object({
  trackCode: TrackCodeSchema,
  launchStatus: TrackLaunchStatusSchema,
  calibrationStatus: CalibrationStatusSchema,
  itemsByLevel: z.record(z.string(), z.number().int()),
  totalItems: z.number().int(),
  /** Competencies with zero authored items — these produce empty gap reports. */
  competenciesWithoutItems: z.array(z.string()),
  /** L3/L4 competencies missing Gold/Silver/Bronze BARS anchors. */
  competenciesWithoutBarsAnchors: z.array(z.string()),
  cutScoresPublishedForLevels: z.array(LevelNumberSchema),
  cronbachAlphaByLevel: z.record(z.string(), z.number()).nullable(),
  panelistCount: z.number().int(),
  /** True when the track can be delivered to a real cohort. */
  readyForDelivery: z.boolean(),
  blockers: z.array(z.string()),
});
export type TrackReadinessDto = z.infer<typeof TrackReadinessDtoSchema>;
