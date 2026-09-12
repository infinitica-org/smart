import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import {
  AssessmentConfidenceLevelSchema,
  CompetencyStatusSchema,
  RecommendedNextStepSchema,
} from './competency-status.js';
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
  highestAssessmentSupportedProficiency: ProficiencyRequirementLevelSchema,
  targetProficiency: ProficiencyRequirementLevelSchema,
  uncertainties: z.array(z.string().max(500)).max(30).default([]),
  recommendedNextStep: RecommendedNextStepSchema,
  requiresInterview: z.boolean().default(false),
  requiresAdditionalAssessment: z.boolean().default(false),
  confidence: AssessmentConfidenceLevelSchema,
  scorePercent: z.number().min(0).max(100).optional(),
  evaluatedAt: IsoDateTimeSchema,
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
