import { z } from 'zod';
import { TaxonomySkillCodeSchema } from '../dto/catalog.dto.js';

export const SkillAssessmentSpecSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  catalogSkillName: z.string().min(2).max(200),
  sdeFormCode: z.string().min(2).max(64),
  taskFamily: z.enum(['CODING', 'APPLIED']),
  skillFocusOptions: z.array(z.string().min(1).max(64)).max(8).default([]),
  flavorNotes: z.array(z.string().min(2).max(120)).max(8).default([]),
});
export type SkillAssessmentSpec = z.infer<typeof SkillAssessmentSpecSchema>;
