import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';
import { SkillCompetencySchema } from './skill-competency.js';
import { CompetencyStatusSchema } from './competency-status.js';
import { ProficiencyRequirementSchema } from './proficiency-requirements.js';

export const FUSION_RULE_SET_VERSION = 'v1';

export const TrustTierSchema = z.enum(['TRUSTED', 'PROVISIONAL', 'UNTRUSTED', 'UNAVAILABLE']);
export type TrustTier = z.infer<typeof TrustTierSchema>;

export const ObservationSchema = z.object({
  competencyId: UuidSchema,
  capability: z.string().min(1).max(500),
  claimedStatus: CompetencyStatusSchema,
  evidence: z.array(z.string().max(500)).max(20).default([]),
  itemCount: z.number().int().min(0).optional(),
});
export type Observation = z.infer<typeof ObservationSchema>;

export const ObservationBundleSchema = z.object({
  sourceId: z.enum(['ASSESSMENT', 'PROJECT']),
  available: z.boolean(),
  trustTier: TrustTierSchema,
  observations: z.array(ObservationSchema).max(50).default([]),
  authenticityFlags: z.array(z.string().max(100)).max(20).default([]),
  appliedCeiling: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'])
    .nullable()
    .optional(),
  metadata: z
    .object({
      testedItemCount: z.number().int().min(0).optional(),
      projectReport: z.unknown().optional(),
    })
    .optional(),
});
export type ObservationBundle = z.infer<typeof ObservationBundleSchema>;

export const FusionTraceEntrySchema = z.object({
  competencyId: UuidSchema,
  fusedStatus: CompetencyStatusSchema,
  contributingSources: z.array(z.enum(['ASSESSMENT', 'PROJECT'])).max(2),
  appliedRuleIds: z.array(z.string().max(64)).max(10).default([]),
  appliedVetoIds: z.array(z.string().max(64)).max(10).default([]),
  divergenceIds: z.array(z.string().max(64)).max(10).default([]).optional(),
  resolvedConflict: z.boolean().optional(),
  ruleSetVersion: z.string().max(40),
  confidenceReason: z.string().max(500),
  inputs: z
    .object({
      ASSESSMENT: CompetencyStatusSchema.optional(),
      PROJECT: CompetencyStatusSchema.optional(),
    })
    .optional(),
});
export type FusionTraceEntry = z.infer<typeof FusionTraceEntrySchema>;

export const CapabilityProfileEntrySchema = z.object({
  competencyId: UuidSchema,
  capability: z.string().min(1).max(500),
  inferredStatus: CompetencyStatusSchema,
  primaryEvidenceSource: z.enum(['ASSESSMENT', 'PROJECT']),
  supportingSources: z
    .array(z.enum(['ASSESSMENT', 'PROJECT']))
    .max(1)
    .default([]),
  observableEvidence: z.array(z.string().max(500)).max(20).default([]),
});
export type CapabilityProfileEntry = z.infer<typeof CapabilityProfileEntrySchema>;

export const CompetencyFusionResultSchema = z.object({
  skillCode: z.string().min(1).max(80),
  capabilityProfile: z.array(CapabilityProfileEntrySchema).max(50).default([]),
  inferredDomainProficiency: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'])
    .nullable(),
  proficiencyInferenceReason: z
    .enum(['INSUFFICIENT_EVIDENCE', 'VETO_BLOCKED'])
    .nullable()
    .optional(),
  ruleSetVersion: z.string().max(40),
  capabilityGaps: z.array(z.string().max(500)).max(30).default([]),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  confidenceReason: z.string().max(1000),
  activeSources: z
    .array(z.enum(['ASSESSMENT', 'PROJECT']))
    .max(2)
    .default([]),
  conflicts: z
    .array(
      z.object({
        type: z.literal('CONFLICT'),
        competencyId: UuidSchema,
        sources: z.array(z.enum(['ASSESSMENT', 'PROJECT'])).length(2),
        message: z.string().max(500),
        resolved: z.boolean(),
      }),
    )
    .max(20)
    .default([]),
  fusionTrace: z.array(FusionTraceEntrySchema).max(50).default([]),
  assessmentComplete: z.boolean(),
  recommendedNextStep: z.enum(['NONE', 'EVIDENCE_VERIFICATION', 'INTERVIEW', 'REMEDIATION']),
});
export type CompetencyFusionResult = z.infer<typeof CompetencyFusionResultSchema>;

export const FUSION_INPUT_SCHEMA = z.object({
  competencyModel: z.array(SkillCompetencySchema).max(50).default([]),
  proficiencyRequirements: z.array(ProficiencyRequirementSchema).max(4).default([]),
  sources: z.array(ObservationBundleSchema).max(2).default([]),
  targetProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']),
  proctoringRiskHigh: z.boolean().default(false),
  ruleSetVersion: z.string().max(40).default(FUSION_RULE_SET_VERSION),
});
export type FusionInput = z.infer<typeof FUSION_INPUT_SCHEMA>;
