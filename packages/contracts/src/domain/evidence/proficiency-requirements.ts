import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';

export const ProficiencyRequirementLevelSchema = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
]);
export type ProficiencyRequirementLevel = z.infer<typeof ProficiencyRequirementLevelSchema>;

export const ProficiencyRequirementSchema = z.object({
  level: ProficiencyRequirementLevelSchema,
  requiredCompetencyIds: z.array(UuidSchema).max(20),
  criticalCompetencyIds: z.array(UuidSchema).max(20).default([]),
});
export type ProficiencyRequirement = z.infer<typeof ProficiencyRequirementSchema>;

export const ProficiencyRequirementsSchema = z.array(ProficiencyRequirementSchema).max(4);
export type ProficiencyRequirements = z.infer<typeof ProficiencyRequirementsSchema>;
