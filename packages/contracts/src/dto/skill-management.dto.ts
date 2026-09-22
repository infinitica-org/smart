import { z } from 'zod';
import { SkillCategoryIdSchema } from './catalog.dto.js';

export const SkillStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type SkillStatus = z.infer<typeof SkillStatusSchema>;

export const CreateSkillDtoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores'),
  name: z.string().trim().min(2).max(150),
  categoryId: SkillCategoryIdSchema,
  categoryName: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
  corroborationEligible: z.boolean().default(true),
  assessmentRequiredForClaim: z.boolean().default(true),
  status: SkillStatusSchema.default('ACTIVE'),
  aliases: z.array(z.string()).optional().default([]),
});

export type CreateSkillDto = z.infer<typeof CreateSkillDtoSchema>;

export const UpdateSkillDtoSchema = CreateSkillDtoSchema.partial();
export type UpdateSkillDto = z.infer<typeof UpdateSkillDtoSchema>;

export const SkillQueryDtoSchema = z.object({
  categoryId: SkillCategoryIdSchema.optional(),
  status: SkillStatusSchema.optional(),
  search: z.string().optional(),
});

export type SkillQueryDto = z.infer<typeof SkillQueryDtoSchema>;

export const SkillManagementRecordSchema = z.object({
  code: z.string(),
  name: z.string(),
  categoryId: SkillCategoryIdSchema,
  categoryName: z.string(),
  description: z.string().optional(),
  corroborationEligible: z.boolean(),
  assessmentRequiredForClaim: z.boolean(),
  status: SkillStatusSchema,
  aliases: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SkillManagementRecord = z.infer<typeof SkillManagementRecordSchema>;

export const MergeSkillsDtoSchema = z.object({
  targetSkillCode: z.string().trim().min(2),
  sourceSkillCodes: z.array(z.string().trim().min(2)).min(1),
  addAsAliases: z.boolean().default(true),
});

export type MergeSkillsDto = z.infer<typeof MergeSkillsDtoSchema>;

export const SkillMergeResultDtoSchema = z.object({
  targetSkillCode: z.string(),
  mergedSkillCodes: z.array(z.string()),
  aliasesAdded: z.array(z.string()),
  recordsReboundCount: z.number(),
  mergedAt: z.string(),
});

export type SkillMergeResultDto = z.infer<typeof SkillMergeResultDtoSchema>;

export const MapSkillsToRoleDtoSchema = z.object({
  roleId: z.string().trim().min(2),
  recommendedSkillCodes: z.array(z.string().trim().min(2)).default([]),
  optionalSkillCodes: z.array(z.string().trim().min(2)).default([]),
});

export type MapSkillsToRoleDto = z.infer<typeof MapSkillsToRoleDtoSchema>;

export const RoleSkillMappingRecordSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  domainId: z.string(),
  recommendedSkillCodes: z.array(z.string()),
  optionalSkillCodes: z.array(z.string()),
  mappedAt: z.string(),
});

export type RoleSkillMappingRecord = z.infer<typeof RoleSkillMappingRecordSchema>;

export const CompetencyItemDtoSchema = z.object({
  name: z.string().trim().min(2).max(200),
  subDomain: z.string().trim().max(100).optional().default('General'),
  realWorldWeight: z.number().min(0).max(1).optional().default(0.1667),
});

export type CompetencyItemDto = z.infer<typeof CompetencyItemDtoSchema>;

export const DefineCompetenciesDtoSchema = z.object({
  skillCode: z.string().trim().min(2),
  competencies: z.array(CompetencyItemDtoSchema).min(1).max(30),
});

export type DefineCompetenciesDto = z.infer<typeof DefineCompetenciesDtoSchema>;

export const SkillCompetencyEntrySchema = z.object({
  competencyId: z.string(),
  name: z.string(),
  subDomain: z.string(),
  realWorldWeight: z.number(),
});

export type SkillCompetencyEntry = z.infer<typeof SkillCompetencyEntrySchema>;

export const SkillCompetenciesRecordSchema = z.object({
  skillCode: z.string(),
  competencies: z.array(SkillCompetencyEntrySchema),
  updatedAt: z.string(),
});

export type SkillCompetenciesRecord = z.infer<typeof SkillCompetenciesRecordSchema>;

export const ProficiencyTierCodeSchema = z.enum(['L1', 'L2', 'L3', 'L4', 'L5']);
export type ProficiencyTierCode = z.infer<typeof ProficiencyTierCodeSchema>;

export const ProficiencyCriteriaItemDtoSchema = z.object({
  tier: ProficiencyTierCodeSchema,
  label: z.string().trim().min(1),
  minScore: z.number().min(0).max(100),
  rubricDescription: z.string().trim().min(2),
  interviewRequired: z.boolean().default(false),
  projectRequired: z.boolean().default(false),
});

export type ProficiencyCriteriaItemDto = z.infer<typeof ProficiencyCriteriaItemDtoSchema>;

export const DefineProficiencyCriteriaDtoSchema = z.object({
  skillCode: z.string().trim().min(2),
  tiers: z.array(ProficiencyCriteriaItemDtoSchema).length(5),
});

export type DefineProficiencyCriteriaDto = z.infer<typeof DefineProficiencyCriteriaDtoSchema>;

export const ProficiencyCriteriaRecordSchema = z.object({
  skillCode: z.string(),
  tiers: z.array(ProficiencyCriteriaItemDtoSchema),
  updatedAt: z.string(),
});

export type ProficiencyCriteriaRecord = z.infer<typeof ProficiencyCriteriaRecordSchema>;

export const SkillVersionRecordSchema = z.object({
  versionId: z.string(),
  skillCode: z.string(),
  versionNumber: z.number().int().min(1),
  semver: z.string(),
  changeType: z.enum([
    'SKILL_CREATED',
    'SKILL_UPDATED',
    'COMPETENCIES_UPDATED',
    'PROFICIENCY_CRITERIA_UPDATED',
    'SKILL_RETIRED',
  ]),
  snapshot: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export type SkillVersionRecord = z.infer<typeof SkillVersionRecordSchema>;

export const SkillVersionHistoryDtoSchema = z.object({
  skillCode: z.string(),
  currentVersion: z.string(),
  totalVersions: z.number().int().min(0),
  versions: z.array(SkillVersionRecordSchema),
});

export type SkillVersionHistoryDto = z.infer<typeof SkillVersionHistoryDtoSchema>;

export const BindScoreRubricVersionDtoSchema = z.object({
  candidateId: z.string().trim().min(1),
  skillCode: z.string().trim().min(2),
  score: z.number().min(0).max(100),
  tierEvaluated: ProficiencyTierCodeSchema,
  versionSemver: z.string().trim().optional(),
});

export type BindScoreRubricVersionDto = z.infer<typeof BindScoreRubricVersionDtoSchema>;

export const HistoricalScoreRubricBindingRecordSchema = z.object({
  bindingId: z.string(),
  candidateId: z.string(),
  skillCode: z.string(),
  score: z.number(),
  tierEvaluated: ProficiencyTierCodeSchema,
  boundRubricVersion: z.string(),
  rubricSnapshot: z.record(z.string(), z.unknown()),
  evaluatedAt: z.string(),
});

export type HistoricalScoreRubricBindingRecord = z.infer<
  typeof HistoricalScoreRubricBindingRecordSchema
>;

export const RetireSkillDtoSchema = z.object({
  skillCode: z.string().trim().min(2),
  reason: z.string().trim().min(5).max(500),
  replacementSkillCode: z.string().trim().optional(),
});

export type RetireSkillDto = z.infer<typeof RetireSkillDtoSchema>;

export const RetireSkillResultDtoSchema = z.object({
  skillCode: z.string(),
  status: z.literal('RETIRED'),
  reason: z.string(),
  replacementSkillCode: z.string().optional(),
  historyPreserved: z.boolean(),
  retiredAt: z.string(),
});

export type RetireSkillResultDto = z.infer<typeof RetireSkillResultDtoSchema>;
