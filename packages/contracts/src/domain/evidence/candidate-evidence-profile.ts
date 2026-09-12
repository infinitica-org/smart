import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';

export const CandidateEvidenceProfileSchema = z.object({
  candidateId: UuidSchema,
  profileId: UuidSchema.optional(),
  careerDomainId: z.string().min(1).max(64).optional(),
  targetRoleId: z.string().min(1).max(64).optional(),
  selectedSkillCodes: z.array(TaxonomySkillCodeSchema).max(100).default([]),
});
export type CandidateEvidenceProfile = z.infer<typeof CandidateEvidenceProfileSchema>;

export const CandidateOnboardingSelectionSchema = z.object({
  careerDomainId: z.string().min(1).max(64),
  targetRoleId: z.string().min(1).max(64),
  confirmedSkillCodes: z.array(TaxonomySkillCodeSchema).min(1).max(100),
});
export type CandidateOnboardingSelection = z.infer<typeof CandidateOnboardingSelectionSchema>;
