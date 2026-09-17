import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import {
  AssessmentConfidenceLevelSchema,
  CompetencyStatusSchema,
  RecommendedNextStepSchema,
} from './competency-status.js';
import { VerificationDecisionOutcomeSchema } from './enums.js';
import { ProficiencyRequirementLevelSchema } from './proficiency-requirements.js';

export const CompetencyResultSchema = z.object({
  competencyId: UuidSchema,
  status: CompetencyStatusSchema,
  confidence: AssessmentConfidenceLevelSchema,
  evidence: z.array(z.string().max(500)).max(20).default([]),
});
export type CompetencyResult = z.infer<typeof CompetencyResultSchema>;

export const AssessmentResultSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  assessmentVersion: z.string().max(40).default('v1'),
  attemptId: UuidSchema,
  competencyResults: z.array(CompetencyResultSchema).max(50),
  highestAssessmentSupportedProficiency: ProficiencyRequirementLevelSchema.nullable(),
  targetProficiency: ProficiencyRequirementLevelSchema,
  /** Assessment phase complete — demonstrated proficiency without further targeted items. */
  assessmentComplete: z.boolean().default(false),
  /** @deprecated Prefer assessmentComplete; kept for backward-compatible clients. */
  assessmentPassed: z.boolean().default(false),
  uncertainties: z.array(z.string().max(500)).max(30).default([]),
  recommendedNextStep: RecommendedNextStepSchema,
  requiresInterview: z.boolean().default(false),
  requiresEvidenceVerification: z.boolean().default(false),
  requiresAdditionalAssessment: z.boolean().default(false),
  confidence: AssessmentConfidenceLevelSchema,
  scorePercent: z.number().min(0).max(100).optional(),
  verificationDecision: VerificationDecisionOutcomeSchema.optional(),
  claimConfidence: z.number().min(0).max(1).optional(),
  /** Persisted when SE-T02 skill-verify interview ran (examiner + grader prompt refs). */
  seT02Interview: z
    .object({
      examinerPromptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
      graderPromptRef: z
        .string()
        .regex(/^[a-z0-9-]+@\d+$/)
        .nullable(),
    })
    .optional(),
  evaluatedAt: IsoDateTimeSchema,
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
