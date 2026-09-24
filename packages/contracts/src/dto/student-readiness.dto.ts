import { z } from 'zod';
import { IsoDateTimeSchema } from './common.js';

/**
 * PRF-02 — the read model behind the student readiness view (I332–I338).
 *
 * Rules this contract enforces:
 *  - A value that cannot be calculated from defined rules is never invented. It is `null` and the
 *    section carries an availability of NOT_CONFIGURED, NO_TARGET_ROLE or NO_DATA with a reason.
 *  - Required evidence comes from the skill blueprint's proficiency requirements; the minimum
 *    proficiency for a role comes from the employer-defined requirements on the opening.
 *  - Completeness and proficiency are separate values and are never combined.
 *  - Optional role skills never affect readiness.
 */

/**
 * AVAILABLE       the calculation ran from defined rules.
 * NOT_CONFIGURED  the rules it depends on are not defined for this subject (for example a catalog role
 *                 has no employer-defined minimum proficiency); no percentage is returned.
 * NO_TARGET_ROLE  the student has not chosen a target role.
 * NO_DATA         there is nothing to measure yet (for example no verified skills).
 */
export const ReadinessAvailabilitySchema = z.enum([
  'AVAILABLE',
  'NOT_CONFIGURED',
  'NO_TARGET_ROLE',
  'NO_DATA',
]);
export type ReadinessAvailability = z.infer<typeof ReadinessAvailabilitySchema>;

/* ------------------------------- identity (I332) ------------------------------- */

/** PENDING and FAILED exist for forward compatibility; nothing persists them yet. */
export const IdentityStatusSchema = z.enum(['NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED']);
export type IdentityStatus = z.infer<typeof IdentityStatusSchema>;

export const IdentitySignalCodeSchema = z.enum(['EMAIL', 'LINKEDIN', 'GITHUB']);
export type IdentitySignalCode = z.infer<typeof IdentitySignalCodeSchema>;

export const IdentitySignalSchema = z.object({
  code: IdentitySignalCodeSchema,
  verified: z.boolean(),
  verifiedAt: IsoDateTimeSchema.nullable(),
});
export type IdentitySignal = z.infer<typeof IdentitySignalSchema>;

export const ReadinessIdentitySchema = z.object({
  status: IdentityStatusSchema,
  signals: z.array(IdentitySignalSchema),
  /** Statuses this deployment can actually return today. */
  supportedStatuses: z.array(IdentityStatusSchema),
  /** Plain-language statement of how the status was derived. */
  rule: z.string(),
});
export type ReadinessIdentity = z.infer<typeof ReadinessIdentitySchema>;

/* ------------------------- evidence completeness (I333) ------------------------- */

/**
 * Evidence the skill blueprint requires for a skill at a given proficiency level. Interviews are a
 * verification gate with no evidence record, so they are not part of evidence completeness.
 */
export const EvidenceRequirementKindSchema = z.enum([
  'REAL_WORLD_APPLICATION',
  'SUBSTANTIAL_APPLICATION',
]);
export type EvidenceRequirementKind = z.infer<typeof EvidenceRequirementKindSchema>;

export const EvidenceRequirementRowSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  level: z.string(),
  requirement: EvidenceRequirementKindSchema,
  met: z.boolean(),
});
export type EvidenceRequirementRow = z.infer<typeof EvidenceRequirementRowSchema>;

export const ReadinessEvidenceSchema = z.object({
  availability: ReadinessAvailabilitySchema,
  reason: z.string().nullable(),
  /** One row per evidence item required by the student's verified skills at their verified levels. */
  requirements: z.array(EvidenceRequirementRowSchema),
  /** What exists, by verification status. These are facts, not a completeness score. */
  counts: z.object({
    total: z.number().int().min(0),
    verified: z.number().int().min(0),
    provisional: z.number().int().min(0),
    pending: z.number().int().min(0),
    disputedOrRejected: z.number().int().min(0),
    expired: z.number().int().min(0),
  }),
  /** Null when there is no verified skill to measure. */
  completeness: z
    .object({
      required: z.number().int().min(0),
      available: z.number().int().min(0),
      percent: z.number().int().min(0).max(100),
    })
    .nullable(),
});
export type ReadinessEvidence = z.infer<typeof ReadinessEvidenceSchema>;

/* ---------------------- skill demonstration + proficiency ---------------------- */

export const DemonstrationStateSchema = z.enum(['DEMONSTRATED', 'PROVISIONAL', 'NOT_DEMONSTRATED']);
export type DemonstrationState = z.infer<typeof DemonstrationStateSchema>;

export const SkillDemonstrationRowSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  claimStatus: z.string(),
  /** Set only when the claim is VERIFIED; a declared claim's placeholder level is never shown. */
  proficiency: z.string().nullable(),
  demonstration: DemonstrationStateSchema,
  verifiedEvidenceCount: z.number().int().min(0),
  provisionalEvidenceCount: z.number().int().min(0),
  /** True when the student holds evidence for this skill that is fully under NDA and cannot be disclosed. */
  evidenceUndisclosable: z.boolean(),
});
export type SkillDemonstrationRow = z.infer<typeof SkillDemonstrationRowSchema>;

export const ReadinessSkillDemonstrationSchema = z.object({
  skills: z.array(SkillDemonstrationRowSchema),
  counts: z.object({
    demonstrated: z.number().int().min(0),
    provisional: z.number().int().min(0),
    notDemonstrated: z.number().int().min(0),
  }),
});
export type ReadinessSkillDemonstration = z.infer<typeof ReadinessSkillDemonstrationSchema>;

/** Proficiency only, kept apart from evidence completeness (I335). Verified claims only. */
export const ReadinessProficiencySchema = z.object({
  verifiedSkillCount: z.number().int().min(0),
  declaredSkillCount: z.number().int().min(0),
  byLevel: z.record(z.string(), z.number().int().min(0)),
});
export type ReadinessProficiency = z.infer<typeof ReadinessProficiencySchema>;

/* ----------------------------- role readiness (I336/I338) ----------------------------- */

export const RoleSkillRequirementSchema = z.enum(['RECOMMENDED', 'OPTIONAL']);
export type RoleSkillRequirement = z.infer<typeof RoleSkillRequirementSchema>;

export const RoleSkillRowSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  requirement: RoleSkillRequirementSchema,
  /** False for OPTIONAL skills: a gap here can never lower readiness. */
  affectsReadiness: z.boolean(),
  selected: z.boolean(),
  claimStatus: z.string().nullable(),
  proficiency: z.string().nullable(),
  demonstration: DemonstrationStateSchema,
  evidenceUndisclosable: z.boolean(),
});
export type RoleSkillRow = z.infer<typeof RoleSkillRowSchema>;

export const ReadinessRoleSchema = z.object({
  availability: ReadinessAvailabilitySchema,
  reason: z.string().nullable(),
  targetRole: z.object({ roleId: z.string(), name: z.string() }).nullable(),
  /** Null unless availability is AVAILABLE. Never a guessed value. */
  readinessPercent: z.number().int().min(0).max(100).nullable(),
  skills: z.array(RoleSkillRowSchema),
  /** Counts of facts only; not a readiness score. */
  coverage: z
    .object({
      recommendedTotal: z.number().int().min(0),
      recommendedVerified: z.number().int().min(0),
      recommendedDemonstrated: z.number().int().min(0),
      optionalTotal: z.number().int().min(0),
      optionalVerified: z.number().int().min(0),
    })
    .nullable(),
});
export type ReadinessRole = z.infer<typeof ReadinessRoleSchema>;

/* ------------------------- readiness for specific open roles (I336) ------------------------- */

export const OpeningSkillStatusSchema = z.enum([
  'MEETS_MINIMUM',
  'BELOW_MINIMUM',
  'NOT_VERIFIED',
  'NOT_HELD',
]);
export type OpeningSkillStatus = z.infer<typeof OpeningSkillStatusSchema>;

export const OpeningSkillRowSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  /** The employer-defined minimum proficiency for this skill on this opening. */
  minProficiency: z.string(),
  /** The student's VERIFIED proficiency, or null. */
  studentProficiency: z.string().nullable(),
  status: OpeningSkillStatusSchema,
  /** Evidence items the blueprint requires at the minimum level, and how many the student has. */
  evidenceRequired: z.number().int().min(0),
  evidenceMet: z.number().int().min(0),
  /** Ready = at or above the minimum proficiency AND every required evidence item present. */
  ready: z.boolean(),
});
export type OpeningSkillRow = z.infer<typeof OpeningSkillRowSchema>;

export const OpeningReadinessSchema = z.object({
  openingId: z.string(),
  roleTitle: z.string(),
  companyName: z.string(),
  location: z.string().nullable(),
  availability: ReadinessAvailabilitySchema,
  reason: z.string().nullable(),
  requiredCount: z.number().int().min(0),
  readyCount: z.number().int().min(0),
  /** round(100 x ready skills / required skills). Null when the opening defines no required skills. */
  readinessPercent: z.number().int().min(0).max(100).nullable(),
  skills: z.array(OpeningSkillRowSchema),
});
export type OpeningReadiness = z.infer<typeof OpeningReadinessSchema>;

/* ------------------------------- recommendations (I337) ------------------------------- */

export const RecommendationKindSchema = z.enum([
  'VERIFY_IDENTITY',
  'ADD_ROLE_SKILL',
  'VERIFY_SKILL',
  'ADD_DEMONSTRATION_EVIDENCE',
  'ADD_REQUIRED_EVIDENCE',
]);
export type RecommendationKind = z.infer<typeof RecommendationKindSchema>;

export const RecommendationPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type RecommendationPriority = z.infer<typeof RecommendationPrioritySchema>;

export const ReadinessRecommendationSchema = z.object({
  id: z.string(),
  kind: RecommendationKindSchema,
  priority: RecommendationPrioritySchema,
  /** True for recommendations about optional role skills; these are never HIGH priority. */
  optional: z.boolean(),
  skillCode: z.string().nullable(),
  title: z.string(),
  detail: z.string(),
  href: z.string(),
});
export type ReadinessRecommendation = z.infer<typeof ReadinessRecommendationSchema>;

/* --------------------------------------- summary --------------------------------------- */

export const StudentReadinessSummarySchema = z.object({
  generatedAt: IsoDateTimeSchema,
  identity: ReadinessIdentitySchema,
  evidence: ReadinessEvidenceSchema,
  skillDemonstration: ReadinessSkillDemonstrationSchema,
  proficiency: ReadinessProficiencySchema,
  roleReadiness: ReadinessRoleSchema,
  /** Readiness for open roles at the student's institution, best first. */
  openingReadiness: z.array(OpeningReadinessSchema),
  recommendations: z.array(ReadinessRecommendationSchema),
});
export type StudentReadinessSummary = z.infer<typeof StudentReadinessSummarySchema>;
