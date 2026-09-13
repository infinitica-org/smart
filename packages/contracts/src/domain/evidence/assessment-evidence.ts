import { z } from 'zod';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';

export const CompetencyEvidenceSchema = z.object({
  competencyId: UuidSchema,
  skillCode: TaxonomySkillCodeSchema,
  capability: z.string().min(1).max(500),
  observedBehaviours: z.array(z.string().max(500)).max(20).default([]),
  scorePercent: ScoreSchema.optional(),
  passed: z.boolean().optional(),
});
export type CompetencyEvidence = z.infer<typeof CompetencyEvidenceSchema>;

export const AssessmentEvidenceSchema = z.object({
  assessmentId: UuidSchema,
  skillCode: TaxonomySkillCodeSchema,
  blueprintVersion: z.string().max(40).optional(),
  attemptId: UuidSchema,
  result: z.enum(['PASSED', 'FAILED', 'INCOMPLETE']),
  competencyEvidence: z.array(CompetencyEvidenceSchema).max(50).default([]),
  timestamp: IsoDateTimeSchema,
  scorePercent: ScoreSchema.optional(),
});
export type AssessmentEvidence = z.infer<typeof AssessmentEvidenceSchema>;
