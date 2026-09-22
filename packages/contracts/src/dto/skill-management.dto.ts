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
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SkillManagementRecord = z.infer<typeof SkillManagementRecordSchema>;
