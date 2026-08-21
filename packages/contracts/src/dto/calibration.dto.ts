import { z } from 'zod';
import {
  CalibrationStatusSchema,
  CertifiableTierSchema,
  LevelNumberSchema,
  StandardSettingMethodSchema,
  TrackCodeSchema,
} from '../domain/enums.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * Calibration & cut-score contracts.
 * Implementation owner: Vedika G (`apps/api-core/src/modules/calibration`).
 *
 * THE TIER AUTHORITY LIVES HERE. `evaluation` produces raw scores; the published
 * cut scores in this module decide the tier. That separation is deliberate: a
 * tier must always be traceable to a named panel of practitioners rather than to
 * a constant someone chose.
 */

export const PanelistDtoSchema = z.object({
  panelistId: UuidSchema,
  name: z.string(),
  roleTitle: z.string(),
  employerName: z.string(),
  /** Whether the employer consented to being credited on public certificates. */
  publicCredit: z.boolean(),
});
export type PanelistDto = z.infer<typeof PanelistDtoSchema>;

export const CalibrationPanelDtoSchema = z.object({
  panelId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  method: StandardSettingMethodSchema,
  panelists: z.array(PanelistDtoSchema),
  /** Product requires 3–5 practising practitioners or hiring managers. */
  panelistCount: z.number().int(),
  convenedAt: IsoDateTimeSchema.nullable(),
  status: CalibrationStatusSchema,
});
export type CalibrationPanelDto = z.infer<typeof CalibrationPanelDtoSchema>;

/**
 * One panelist's Angoff estimate: "what percentage would a borderline-but-
 * acceptable candidate get right?"
 */
export const AngoffEstimateSchema = z.object({
  panelId: UuidSchema,
  panelistId: UuidSchema,
  tier: CertifiableTierSchema,
  estimatedValue: ScoreSchema,
  note: z.string().max(1_000).optional(),
});
export type AngoffEstimate = z.infer<typeof AngoffEstimateSchema>;

export const SubmitAngoffEstimatesRequestSchema = z.object({
  panelId: UuidSchema,
  estimates: z.array(AngoffEstimateSchema).min(1),
});
export type SubmitAngoffEstimatesRequest = z.infer<typeof SubmitAngoffEstimatesRequestSchema>;

/**
 * A derived cut score. `Cut = mean(panel estimates) ± SD(panel estimates)`, and
 * the SD is what becomes the visible confidence band on the certificate.
 *
 * Cut scores are DERIVED, never invented — see ARCHITECTURE.md §6.2.
 */
export const CutScoreDtoSchema = z.object({
  cutScoreId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  tier: CertifiableTierSchema,
  /** mu — mean of panelist estimates. */
  meanValue: ScoreSchema,
  /** sigma — standard deviation; the published confidence band. */
  sdValue: z.number().min(0),
  panelistCount: z.number().int(),
  method: StandardSettingMethodSchema,
  publishedAt: IsoDateTimeSchema.nullable(),
  /** Unpublished cut scores must not be used to award a tier. */
  published: z.boolean(),
});
export type CutScoreDto = z.infer<typeof CutScoreDtoSchema>;

/** Full cut-score set for one track+level. Cached as `cut_scores:track:{id}`. */
export const CutScoreSetDtoSchema = z.object({
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  gold: CutScoreDtoSchema,
  silver: CutScoreDtoSchema,
  bronze: CutScoreDtoSchema,
});
export type CutScoreSetDto = z.infer<typeof CutScoreSetDtoSchema>;

/* ---------------------------- reliability & notes -------------------------- */

export const ReliabilityDtoSchema = z.object({
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  /** Cronbach's alpha, or KR-20 for dichotomous right/wrong items. */
  coefficient: z.number(),
  coefficientKind: z.enum(['CRONBACH_ALPHA', 'KR_20']),
  sampleSize: z.number().int(),
  itemCount: z.number().int(),
  /** False when coefficient < 0.70; the confidence note downgrades automatically. */
  meetsAcademicMinimum: z.boolean(),
  computedAt: IsoDateTimeSchema,
});
export type ReliabilityDto = z.infer<typeof ReliabilityDtoSchema>;

/**
 * The Confidence Note — SMART's honesty mechanism. Every result and every
 * certificate carries one. It states sample size, reliability and calibration
 * maturity, and it downgrades itself automatically rather than waiting for
 * someone to remember.
 */
export const ConfidenceNoteDtoSchema = z.object({
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  calibrationStatus: CalibrationStatusSchema,
  sampleSize: z.number().int(),
  reliabilityCoefficient: z.number().nullable(),
  panelistCount: z.number().int(),
  /** Employers who validated the cut scores and consented to be credited. */
  calibrationEmployers: z.array(z.string()),
  /** Rendered text shown on the certificate and the verification page. */
  noteText: z.string(),
  /** True when reliability or panel size is below the honest-claim threshold. */
  downgraded: z.boolean(),
  downgradeReason: z.string().nullable(),
  placementCyclesObserved: z.number().int(),
  generatedAt: IsoDateTimeSchema,
});
export type ConfidenceNoteDto = z.infer<typeof ConfidenceNoteDtoSchema>;
