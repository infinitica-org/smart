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
import {
  INF_SE_V1_TAXONOMY_VERSION,
  SE_SKILL_CATEGORIES,
  SE_SKILL_CATEGORY_IDS,
  SE_SKILL_CODE_SET,
  SKILL_TAG_TYPES,
  TOOL_PROFICIENCY_TIERS,
  groupSeSkillsByCategory,
} from '../domain/se-skills.js';
import {
  SKILL_CODE_SET,
  SKILL_STREAMS,
  SKILL_TAXONOMY_DOMAINS,
  SKILL_TAXONOMY_VERSION,
} from '../domain/skills.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema, WeightSchema } from './common.js';

/** INF-05 skill code only — never free-text names (SK-T01 / JD pickers). */
export const TaxonomySkillCodeSchema = z
  .string()
  .min(2)
  .max(64)
  .refine((code) => SKILL_CODE_SET.has(code), { message: 'Unknown taxonomy skill code' });

export const SkillLibraryItemDtoSchema = z.object({
  code: TaxonomySkillCodeSchema,
  name: z.string().min(1),
  domain: z.enum(SKILL_TAXONOMY_DOMAINS),
  stream: z.enum(SKILL_STREAMS),
});
export type SkillLibraryItemDto = z.infer<typeof SkillLibraryItemDtoSchema>;

export const SkillLibraryResponseSchema = z.object({
  taxonomyVersion: z.string().min(1).max(32),
  skills: z.array(SkillLibraryItemDtoSchema),
});
export type SkillLibraryResponse = z.infer<typeof SkillLibraryResponseSchema>;

/** inf-se-v1 skill code only — parallel SE verification framework (S6-RM-13). */
export const SeTaxonomySkillCodeSchema = z
  .string()
  .min(2)
  .max(64)
  .refine((code) => SE_SKILL_CODE_SET.has(code), { message: 'Unknown inf-se-v1 skill code' });

export const SeSkillLibraryItemDtoSchema = z.object({
  code: SeTaxonomySkillCodeSchema,
  name: z.string().min(1),
  categoryId: z.enum(SE_SKILL_CATEGORY_IDS),
  categoryName: z.string().min(1),
  tagType: z.enum(SKILL_TAG_TYPES),
  competencyBars: z.object({
    BEGINNER: z.string().min(1),
    INTERMEDIATE: z.string().min(1),
    ADVANCED: z.string().min(1),
    PROFESSIONAL: z.string().min(1),
  }),
  toolBars: z.record(z.enum(TOOL_PROFICIENCY_TIERS), z.string().min(1)).optional(),
  corroborationEligible: z.boolean(),
  assessmentRequiredForClaim: z.boolean(),
});
export type SeSkillLibraryItemDto = z.infer<typeof SeSkillLibraryItemDtoSchema>;

export const SeSkillCategoryGroupDtoSchema = z.object({
  id: z.enum(SE_SKILL_CATEGORY_IDS),
  name: z.string().min(1),
  skills: z.array(SeSkillLibraryItemDtoSchema),
});
export type SeSkillCategoryGroupDto = z.infer<typeof SeSkillCategoryGroupDtoSchema>;

export const SeSkillLibraryResponseSchema = z.object({
  taxonomyVersion: z.literal(INF_SE_V1_TAXONOMY_VERSION),
  categories: z.array(SeSkillCategoryGroupDtoSchema).length(SE_SKILL_CATEGORY_IDS.length),
});
export type SeSkillLibraryResponse = z.infer<typeof SeSkillLibraryResponseSchema>;

/** Canonical inf-se-v1 library — single source for catalog API and JSON drift checks. */
export function buildSeSkillLibraryResponse(): SeSkillLibraryResponse {
  return SeSkillLibraryResponseSchema.parse({
    taxonomyVersion: INF_SE_V1_TAXONOMY_VERSION,
    categories: groupSeSkillsByCategory().map((category) => ({
      id: category.id,
      name: category.name,
      skills: category.skills.map((skill) => ({
        code: skill.code,
        name: skill.name,
        categoryId: skill.categoryId,
        categoryName: SE_SKILL_CATEGORIES[skill.categoryId].name,
        tagType: skill.tagType,
        competencyBars: { ...skill.competencyBars },
        toolBars: skill.toolBars ? { ...skill.toolBars } : undefined,
        corroborationEligible: skill.corroborationEligible,
        assessmentRequiredForClaim: skill.assessmentRequiredForClaim,
      })),
    })),
  });
}

/** Throws when committed JSON diverges from contracts (tamper / drift guard). */
export function assertInfSeV1MatchesCanonical(candidate: unknown): void {
  const parsed = SeSkillLibraryResponseSchema.parse(candidate);
  const canonical = buildSeSkillLibraryResponse();
  if (JSON.stringify(canonical) !== JSON.stringify(parsed)) {
    throw new Error('inf-se-v1.json drifts from contracts SE_SKILL_DEFINITIONS');
  }
}

export const SkillsClaimedSnapshotSchema = z.object({
  taxonomyVersion: z.string().min(1).max(32),
  skillCodes: z.array(z.string().min(2).max(64)),
});
export type SkillsClaimedSnapshot = z.infer<typeof SkillsClaimedSnapshotSchema>;

export function snapshotSkillsClaimed(skillCodes: readonly string[]): SkillsClaimedSnapshot {
  return SkillsClaimedSnapshotSchema.parse({
    taxonomyVersion: SKILL_TAXONOMY_VERSION,
    skillCodes: [...skillCodes],
  });
}

/** Returns a frozen snapshot for verified rows; null while still editable. */
export function skillsClaimedSnapshotWhenVerified(
  status: string,
  skillCodes: readonly string[],
): SkillsClaimedSnapshot | null {
  if (status !== 'VERIFIED') return null;
  return snapshotSkillsClaimed(skillCodes);
}

/**
 * Catalog contracts — tracks, competencies, levels and item delivery.
 * Implementation owner: Vedika G (`apps/api-core/src/modules/catalog`).
 *
 * IMPORTANT for `assessment` (Vishal Bharath R): item delivery goes through
 * `AssignedFormDto` only. Never query the item bank directly — parallel-form
 * rotation, exposure tracking and item retirement are the anti-cheat mechanism
 * and they live behind this contract.
 */

/**
 * PRD v1 §7.3 pass bars for a claimed proficiency (Beginner / Intermediate / Advanced).
 * Beginner is assessment-only (`interviewPass` is null, `assessmentWeight` is 1).
 * Intermediate/Advanced require assessment + interview; both floors must clear.
 * These are claim pass bars — not Gold/Silver/Bronze cut scores.
 */
export const ProficiencyPassBarsDtoSchema = z.object({
  assessmentPass: WeightSchema,
  interviewPass: WeightSchema.nullable(),
  assessmentWeight: WeightSchema,
});
export type ProficiencyPassBarsDto = z.infer<typeof ProficiencyPassBarsDtoSchema>;

export const SkillPassThresholdsDtoSchema = z.object({
  BEGINNER: ProficiencyPassBarsDtoSchema,
  INTERMEDIATE: ProficiencyPassBarsDtoSchema,
  ADVANCED: ProficiencyPassBarsDtoSchema,
});
export type SkillPassThresholdsDto = z.infer<typeof SkillPassThresholdsDtoSchema>;

export const CompetencyDtoSchema = z.object({
  competencyId: UuidSchema,
  trackCode: TrackCodeSchema,
  domainCode: DomainCodeSchema,
  name: z.string(),
  subDomain: z.string(),
  /** `real_world_weight` — contribution to the track score. Sums to 1.0 per track. */
  realWorldWeight: WeightSchema,
  assessedAtLevels: z.array(LevelNumberSchema),
  /**
   * Claim-level pass bars (PRD v1 §7.3). Optional until the INF-05 catalog seed
   * PR populates them. Independent of L1–L5 Angoff cut scores.
   */
  passThresholds: SkillPassThresholdsDtoSchema.optional(),
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
