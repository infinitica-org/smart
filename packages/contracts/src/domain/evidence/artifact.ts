import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import { AccessibilityLevelSchema, ArtifactTypeSchema, IntegrityStatusSchema } from './enums.js';

export const ArtifactSchema = z.object({
  artifactId: UuidSchema,
  artifactType: ArtifactTypeSchema,
  artifactReference: z.string().min(1).max(2000),
  owner: z.string().max(120).optional(),
  createdDate: z.string().max(32).optional(),
  relatedSkill: TaxonomySkillCodeSchema.optional(),
  relatedContribution: z.string().max(2000).optional(),
  relatedComponent: z.string().max(500).optional(),
  contributionSupported: z.string().max(2000).optional(),
  accessibility: AccessibilityLevelSchema.default('PRIVATE'),
  integrityStatus: IntegrityStatusSchema.default('UNCHECKED'),
  createdAt: IsoDateTimeSchema.optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const CreateArtifactSchema = ArtifactSchema.omit({ artifactId: true, createdAt: true });
export type CreateArtifact = z.infer<typeof CreateArtifactSchema>;
