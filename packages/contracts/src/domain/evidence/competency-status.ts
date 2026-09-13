import { z } from 'zod';

export const COMPETENCY_STATUSES = [
  'DEMONSTRATED',
  'PARTIALLY_DEMONSTRATED',
  'UNCERTAIN',
  'NOT_DEMONSTRATED',
  'NOT_TESTED',
] as const;

export const CompetencyStatusSchema = z.enum(COMPETENCY_STATUSES);
export type CompetencyStatus = z.infer<typeof CompetencyStatusSchema>;

export const ASSESSMENT_CONFIDENCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const AssessmentConfidenceLevelSchema = z.enum(ASSESSMENT_CONFIDENCE_LEVELS);
export type AssessmentConfidenceLevel = z.infer<typeof AssessmentConfidenceLevelSchema>;

export const ASSESSMENT_STAGES = ['DIAGNOSTIC', 'TARGETED', 'COMPLETE'] as const;
export const AssessmentStageSchema = z.enum(ASSESSMENT_STAGES);
export type AssessmentStage = z.infer<typeof AssessmentStageSchema>;

export const RECOMMENDED_NEXT_STEPS = [
  'NONE',
  'TARGETED_ASSESSMENT',
  'EVIDENCE_VERIFICATION',
  'INTERVIEW',
  'REMEDIATION',
] as const;
export const RecommendedNextStepSchema = z.enum(RECOMMENDED_NEXT_STEPS);
export type RecommendedNextStep = z.infer<typeof RecommendedNextStepSchema>;
