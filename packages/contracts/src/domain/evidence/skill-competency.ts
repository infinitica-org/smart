import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';

export const CompetencyDifficultySchema = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'PROFICIENT',
  'ADVANCED',
  'PROFESSIONAL',
]);
export type CompetencyDifficulty = z.infer<typeof CompetencyDifficultySchema>;

export const CompetencyRoleSchema = z.enum(['core', 'supporting', 'critical']);
export type CompetencyRole = z.infer<typeof CompetencyRoleSchema>;

export const SkillCompetencySchema = z.object({
  competencyId: UuidSchema,
  skillCode: TaxonomySkillCodeSchema,
  capability: z.string().min(1).max(500),
  observableBehaviours: z.array(z.string().max(500)).max(30).default([]),
  difficulty: CompetencyDifficultySchema.optional(),
  assessmentCriteria: z.array(z.string().max(500)).max(30).default([]),
  prerequisites: z.array(UuidSchema).max(10).default([]),
  role: CompetencyRoleSchema.default('supporting'),
});
export type SkillCompetency = z.infer<typeof SkillCompetencySchema>;
