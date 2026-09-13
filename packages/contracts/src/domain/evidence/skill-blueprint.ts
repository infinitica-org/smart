import { z } from 'zod';
import { FreshnessClassSchema } from './enums.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import { getSkillDefinition } from '../skill-taxonomy.js';
import type { SkillCategoryId } from '../skill-taxonomy.js';
import { SkillCompetencySchema } from './skill-competency.js';
import {
  buildCategoryCompetencyModel,
  buildDefaultProficiencyRequirements,
} from './category-competency-templates.js';
import { ProficiencyRequirementsSchema } from './proficiency-requirements.js';

export const EvidenceRequirementSchema = z.object({
  evidenceType: z.string().min(1).max(64),
  minimumCount: z.number().int().min(1).max(20).default(1),
  description: z.string().max(500).optional(),
});
export type EvidenceRequirement = z.infer<typeof EvidenceRequirementSchema>;

export const FreshnessPolicySchema = z.object({
  maxAgeDays: z.number().int().min(1).max(3650),
  staleClass: FreshnessClassSchema.default('STALE'),
  refreshRequired: z.boolean().default(false),
});
export type FreshnessPolicy = z.infer<typeof FreshnessPolicySchema>;

export const SkillBlueprintSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(64),
  category: z.string().min(1).max(120),
  prerequisites: z.array(TaxonomySkillCodeSchema).max(20).default([]),
  competencyModel: z.array(SkillCompetencySchema).max(50).default([]),
  proficiencyRequirements: ProficiencyRequirementsSchema.default([]),
  proficiencyDefinitions: z.record(z.string(), z.string().max(2000)).optional(),
  assessmentBlueprint: z.string().max(120).optional(),
  evidenceRequirements: z.array(EvidenceRequirementSchema).max(20).default([]),
  interviewBlueprint: z.string().max(120).optional(),
  freshnessPolicy: FreshnessPolicySchema.optional(),
  roleMappings: z.array(z.string().min(1).max(64)).max(50).default([]),
});
export type SkillBlueprint = z.infer<typeof SkillBlueprintSchema>;

export function buildMinimalSkillBlueprint(
  skillCode: string,
  name: string,
  domain: string,
  category: string,
): SkillBlueprint {
  return buildSkillBlueprintForCategory(skillCode, name, domain, category, null);
}

export function buildSkillBlueprintForCategory(
  skillCode: string,
  name: string,
  domain: string,
  category: string,
  categoryId: SkillCategoryId | null,
): SkillBlueprint {
  const resolvedCategoryId =
    categoryId ?? getSkillDefinition(skillCode)?.categoryId ?? 'PROGRAMMING_LANGUAGES';
  const competencyModel = buildCategoryCompetencyModel(skillCode, resolvedCategoryId);
  const proficiencyRequirements = buildDefaultProficiencyRequirements(resolvedCategoryId);
  return {
    skillCode,
    name,
    domain,
    category,
    prerequisites: [],
    competencyModel,
    proficiencyRequirements,
    evidenceRequirements: [
      {
        evidenceType: 'WORK_EXPERIENCE',
        minimumCount: 1,
        description: 'Demonstrated on-the-job use',
      },
      {
        evidenceType: 'PROJECT',
        minimumCount: 1,
        description: 'Personal contribution in a project',
      },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  };
}
