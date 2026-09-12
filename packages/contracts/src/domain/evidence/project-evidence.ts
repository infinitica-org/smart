import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import { EvidenceVerificationStatusSchema, NdaStatusSchema, ProjectTypeSchema } from './enums.js';
import { ActivitySchema, ContributionSchema } from './metadata.js';

export const ProjectComponentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  stackOrTools: z.array(z.string().max(120)).max(30).default([]),
});
export type ProjectComponent = z.infer<typeof ProjectComponentSchema>;

export const ProjectSkillMappingSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  specificContribution: z.string().min(1).max(4000),
  componentWorkedOn: z.string().max(500).optional(),
  actionsPerformed: z.array(z.string().max(500)).max(30).default([]),
  decisionsMade: z.array(z.string().max(500)).max(20).default([]),
  constraintsHandled: z.array(z.string().max(500)).max(20).default([]),
  artifactId: UuidSchema.nullable().optional(),
  verificationStatus: EvidenceVerificationStatusSchema.default('PENDING'),
  activity: ActivitySchema.optional(),
});
export type ProjectSkillMapping = z.infer<typeof ProjectSkillMappingSchema>;

export const ProjectEvidenceSchema = z.object({
  projectId: UuidSchema,
  title: z.string().min(1).max(200),
  projectType: ProjectTypeSchema.default('OTHER'),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
  teamSize: z.number().int().min(1).max(500).optional(),
  candidateRole: z.string().max(200).optional(),
  problem: z.string().max(4000).optional(),
  targetUsers: z.string().max(500).optional(),
  requirements: z.string().max(4000).optional(),
  approach: z.string().max(4000).optional(),
  stackOrTools: z.array(z.string().max(120)).max(50).default([]),
  components: z.array(ProjectComponentSchema).max(30).default([]),
  personalContributions: z.array(ContributionSchema).max(30).default([]),
  decisions: z.array(z.string().max(2000)).max(30).default([]),
  constraints: z.array(z.string().max(2000)).max(30).default([]),
  outcomes: z.array(z.string().max(2000)).max(30).default([]),
  teamContribution: z.string().max(4000).optional(),
  skillMappings: z.array(ProjectSkillMappingSchema).max(50).default([]),
  ndaStatus: NdaStatusSchema.default('NONE'),
  artifactIds: z.array(UuidSchema).max(30).default([]),
  verificationStatus: EvidenceVerificationStatusSchema.default('PENDING'),
});
export type ProjectEvidence = z.infer<typeof ProjectEvidenceSchema>;
