import { z } from 'zod';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';

export const InterviewQuestionSchema = z.object({
  questionId: UuidSchema.optional(),
  prompt: z.string().min(1).max(4000),
  evidenceTarget: z.string().max(500).optional(),
  assessmentTarget: z.string().max(500).optional(),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const InterviewResponseSchema = z.object({
  questionId: UuidSchema.optional(),
  response: z.string().min(1).max(8000),
  scorePercent: ScoreSchema.optional(),
  passed: z.boolean().optional(),
  evidenceExtracted: z.array(z.string().max(500)).max(20).default([]),
});
export type InterviewResponse = z.infer<typeof InterviewResponseSchema>;

export const InterviewEvidenceSchema = z.object({
  interviewId: UuidSchema,
  skillCode: TaxonomySkillCodeSchema,
  questions: z.array(InterviewQuestionSchema).max(30).default([]),
  evidenceTargets: z.array(z.string().max(500)).max(30).default([]),
  assessmentTargets: z.array(z.string().max(500)).max(30).default([]),
  responses: z.array(InterviewResponseSchema).max(30).default([]),
  result: z.enum(['PASSED', 'FAILED', 'INCOMPLETE']).optional(),
  conductedAt: IsoDateTimeSchema.optional(),
});
export type InterviewEvidence = z.infer<typeof InterviewEvidenceSchema>;
