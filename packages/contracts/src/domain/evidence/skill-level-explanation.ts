import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { SkillClaimStatusSchema } from '../enums.js';
import { FreshnessClassSchema } from './enums.js';
import { AssessmentConfidenceLevelSchema, CompetencyStatusSchema } from './competency-status.js';
import { PROFICIENCY_LEVEL_ORDER } from '../skill-levels.js';
import { FUSION_RULE_SET_VERSION } from './competency-fusion.js';

export const SKILL_LEVEL_EXPLANATION_BASES = [
  'ASSESSMENT_AND_EVIDENCE',
  'ASSESSMENT_ONLY',
  'EVIDENCE_ONLY',
  'NONE',
] as const;
export const SkillLevelExplanationBasisSchema = z.enum(SKILL_LEVEL_EXPLANATION_BASES);
export type SkillLevelExplanationBasis = z.infer<typeof SkillLevelExplanationBasisSchema>;

export const SKILL_CONCLUSION_ALIGNMENTS = [
  'ALIGNED',
  'ASSESSED_BELOW_VERIFIED',
  'ASSESSED_ABOVE_VERIFIED',
  'INFERENCE_DIVERGES_FROM_VERIFIED',
  'VERIFIED_ONLY',
  'INFERENCE_ONLY',
  'NO_CONCLUSION',
] as const;
export const SkillConclusionAlignmentSchema = z.enum(SKILL_CONCLUSION_ALIGNMENTS);
export type SkillConclusionAlignment = z.infer<typeof SkillConclusionAlignmentSchema>;

export const SkillLevelConclusionSchema = z.object({
  proficiency: z.enum(PROFICIENCY_LEVEL_ORDER).nullable(),
  summary: z.string().max(1000),
  source: z.enum(['SKILL_CLAIM', 'ASSESSMENT', 'FUSION', 'NONE']),
  claimType: z.enum(['VERIFIED_FACT', 'AI_INFERENCE']).default('VERIFIED_FACT'),
});
export type SkillLevelConclusion = z.infer<typeof SkillLevelConclusionSchema>;

export const VerifiedVsAiConclusionSchema = z.object({
  verified: SkillLevelConclusionSchema.nullable(),
  assessmentSupported: SkillLevelConclusionSchema.nullable(),
  evidenceInferred: SkillLevelConclusionSchema.nullable(),
  alignment: SkillConclusionAlignmentSchema,
  headline: z.string().max(500),
  detail: z.string().max(2000),
});
export type VerifiedVsAiConclusion = z.infer<typeof VerifiedVsAiConclusionSchema>;

export const SkillExplanationReportRefSchema = z.object({
  kind: z.enum(['ASSESSMENT_ATTEMPT', 'PROJECT_VERIFICATION']),
  id: UuidSchema,
  label: z.string().max(200),
  evaluatedAt: IsoDateTimeSchema.optional(),
  promptRef: z.string().max(80).optional(),
});
export type SkillExplanationReportRef = z.infer<typeof SkillExplanationReportRefSchema>;

export const SkillEvidenceFreshnessRowSchema = z.object({
  evidenceId: UuidSchema,
  label: z.string().max(200),
  freshnessClass: FreshnessClassSchema,
  ageDays: z.number().int().min(0),
  maxAgeDays: z.number().int().min(1).optional(),
  staleAffectsConfidence: z.boolean(),
});
export type SkillEvidenceFreshnessRow = z.infer<typeof SkillEvidenceFreshnessRowSchema>;

export const CompetencyExplanationRowSchema = z.object({
  competencyId: UuidSchema,
  capability: z.string().max(500),
  status: CompetencyStatusSchema,
  primarySource: z.enum(['ASSESSMENT', 'PROJECT']),
  why: z.string().max(500),
});
export type CompetencyExplanationRow = z.infer<typeof CompetencyExplanationRowSchema>;

export const EmployerSkillConfidenceIndicatorSchema = z.object({
  code: z.enum([
    'VERIFIED_SKILL',
    'MULTI_SOURCE',
    'FRESH_EVIDENCE',
    'LOW_EVIDENCE',
    'MISSING_EVIDENCE',
    'STALE_EVIDENCE',
    'AI_INFERENCE',
    'DIVERGENT_SOURCES',
  ]),
  label: z.string().max(120),
  tone: z.enum(['positive', 'neutral', 'caution']),
});
export type EmployerSkillConfidenceIndicator = z.infer<
  typeof EmployerSkillConfidenceIndicatorSchema
>;

export const SkillLevelExplanationSchema = z.object({
  skillCode: z.string().min(1).max(80),
  skillName: z.string().max(200),
  claimStatus: SkillClaimStatusSchema,
  basis: SkillLevelExplanationBasisSchema,
  whyThisLevel: z.string().max(2000),
  verifiedVsAi: VerifiedVsAiConclusionSchema,
  competencyRows: z.array(CompetencyExplanationRowSchema).max(50).default([]),
  reportRefs: z.array(SkillExplanationReportRefSchema).max(20).default([]),
  freshness: z.array(SkillEvidenceFreshnessRowSchema).max(20).default([]),
  confidence: AssessmentConfidenceLevelSchema,
  confidenceReason: z.string().max(1000),
  ruleSetVersion: z.string().max(40).default(FUSION_RULE_SET_VERSION),
  computedAt: IsoDateTimeSchema,
});
export type SkillLevelExplanation = z.infer<typeof SkillLevelExplanationSchema>;

export const EmployerSkillInspectionSchema = SkillLevelExplanationSchema.extend({
  studentId: UuidSchema,
  employerConfidenceIndicators: z.array(EmployerSkillConfidenceIndicatorSchema).max(8).default([]),
});
export type EmployerSkillInspection = z.infer<typeof EmployerSkillInspectionSchema>;

export const GetSkillLevelExplanationResponseSchema = SkillLevelExplanationSchema;
export type GetSkillLevelExplanationResponse = z.infer<
  typeof GetSkillLevelExplanationResponseSchema
>;

export const GetEmployerSkillInspectionResponseSchema = EmployerSkillInspectionSchema;
export type GetEmployerSkillInspectionResponse = z.infer<
  typeof GetEmployerSkillInspectionResponseSchema
>;
