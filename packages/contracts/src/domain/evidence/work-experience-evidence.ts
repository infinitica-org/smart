import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import { EmploymentTypeSchema } from '../enums.js';
import {
  EvidenceVerificationStatusSchema,
  IndependenceLevelSchema,
  ResponsibilityLevelSchema,
} from './enums.js';
import { ActivitySchema, ContributionSchema, SkillMappingSchema } from './metadata.js';

export const WorkExperienceResponsibilitySchema = z.object({
  responsibilityId: UuidSchema.optional(),
  task: z.string().min(1).max(2000),
  skillCode: TaxonomySkillCodeSchema.optional(),
  personalContribution: z.string().min(1).max(4000),
  responsibilityLevel: ResponsibilityLevelSchema,
  independence: IndependenceLevelSchema.optional(),
  tools: z.array(z.string().max(120)).max(30).default([]),
  decision: z.string().max(2000).optional(),
  constraint: z.string().max(2000).optional(),
  outcome: z.string().max(2000).optional(),
  artifactId: UuidSchema.nullable().optional(),
  activity: ActivitySchema.optional(),
});
export type WorkExperienceResponsibility = z.infer<typeof WorkExperienceResponsibilitySchema>;

export const EmploymentVerificationSchema = z.object({
  verifierName: z.string().max(120).optional(),
  verifierRole: z.string().max(120).optional(),
  verifierContact: z.string().max(200).optional(),
  verificationStatus: EvidenceVerificationStatusSchema.default('PENDING'),
  verifiedAt: IsoDateTimeSchema.nullable().optional(),
});
export type EmploymentVerification = z.infer<typeof EmploymentVerificationSchema>;

export const WorkExperienceEvidenceSchema = z.object({
  experienceId: UuidSchema,
  employer: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  employmentType: EmploymentTypeSchema,
  startDate: z.string().min(1).max(32),
  endDate: z.string().max(32).nullable().optional(),
  location: z.string().max(120).optional(),
  departmentOrTeam: z.string().max(120).optional(),
  responsibilities: z.array(WorkExperienceResponsibilitySchema).max(50).default([]),
  deliverables: z.array(z.string().max(2000)).max(50).default([]),
  skillMappings: z.array(SkillMappingSchema).max(50).default([]),
  personalContributions: z.array(ContributionSchema).max(50).default([]),
  employmentVerification: EmploymentVerificationSchema.optional(),
});
export type WorkExperienceEvidence = z.infer<typeof WorkExperienceEvidenceSchema>;
