import { z } from 'zod';
import {
  ArtifactSchema,
  CandidateEvidenceProfileSchema,
  CandidateOnboardingSelectionSchema,
  CareerDomainSchema,
  CreateEvidenceRecordSchema,
  CreateVerificationDecisionSchema,
  EvidenceRecordSchema,
  FrameworkSkillClaimSchema,
  PassiveSignalEvidenceSchema,
  ProfessionalCredentialSchema,
  ProjectEvidenceSchema,
  ProjectSkillMappingSchema,
  SkillBlueprintSchema,
  TargetRoleSchema,
  VerificationDecisionSchema,
  WorkExperienceEvidenceSchema,
  WorkExperienceResponsibilitySchema,
  frameworkSkillClaimFromDto,
  frameworkSkillClaimToDto,
} from '../domain/evidence/index.js';
import { IsoDateTimeSchema, UuidSchema, paginatedSchema } from './common.js';
import { TaxonomySkillCodeSchema } from './catalog.dto.js';

export { frameworkSkillClaimFromDto, frameworkSkillClaimToDto };

export const EvidenceRecordDtoSchema = EvidenceRecordSchema;
export type EvidenceRecordDto = z.infer<typeof EvidenceRecordDtoSchema>;

export const CreateEvidenceRequestSchema = CreateEvidenceRecordSchema;
export type CreateEvidenceRequest = z.infer<typeof CreateEvidenceRequestSchema>;

export const UpdateEvidenceRequestSchema = CreateEvidenceRecordSchema.partial().omit({
  candidateId: true,
});
export type UpdateEvidenceRequest = z.infer<typeof UpdateEvidenceRequestSchema>;

export const ListEvidenceQuerySchema = z.object({
  skillCode: TaxonomySkillCodeSchema.optional(),
  claimId: UuidSchema.optional(),
  evidenceType: z.string().max(64).optional(),
});
export type ListEvidenceQuery = z.infer<typeof ListEvidenceQuerySchema>;

export const EvidenceListResponseSchema = paginatedSchema(EvidenceRecordDtoSchema);
export type EvidenceListResponse = z.infer<typeof EvidenceListResponseSchema>;

export const LinkEvidenceToClaimRequestSchema = z.object({
  claimId: UuidSchema,
  evidenceId: UuidSchema,
  weight: z.number().min(0).max(1).default(1),
});
export type LinkEvidenceToClaimRequest = z.infer<typeof LinkEvidenceToClaimRequestSchema>;

export const SkillClaimEvidenceLinkDtoSchema = z.object({
  linkId: UuidSchema,
  claimId: UuidSchema,
  evidenceId: UuidSchema,
  weight: z.number().min(0).max(1),
  createdAt: IsoDateTimeSchema,
});
export type SkillClaimEvidenceLinkDto = z.infer<typeof SkillClaimEvidenceLinkDtoSchema>;

export const VerificationDecisionDtoSchema = VerificationDecisionSchema;
export type VerificationDecisionDto = z.infer<typeof VerificationDecisionDtoSchema>;

export const CreateVerificationDecisionRequestSchema = CreateVerificationDecisionSchema;
export type CreateVerificationDecisionRequest = z.infer<
  typeof CreateVerificationDecisionRequestSchema
>;

export const WorkExperienceEvidenceDtoSchema = WorkExperienceEvidenceSchema;
export type WorkExperienceEvidenceDto = z.infer<typeof WorkExperienceEvidenceDtoSchema>;

export const WorkExperienceResponsibilityDtoSchema = WorkExperienceResponsibilitySchema;
export type WorkExperienceResponsibilityDto = z.infer<typeof WorkExperienceResponsibilityDtoSchema>;

export const ProjectEvidenceDtoSchema = ProjectEvidenceSchema;
export type ProjectEvidenceDto = z.infer<typeof ProjectEvidenceDtoSchema>;

export const ProjectSkillMappingDtoSchema = ProjectSkillMappingSchema;
export type ProjectSkillMappingDto = z.infer<typeof ProjectSkillMappingDtoSchema>;

export const ProfessionalCredentialDtoSchema = ProfessionalCredentialSchema;
export type ProfessionalCredentialDto = z.infer<typeof ProfessionalCredentialDtoSchema>;

export const PassiveSignalEvidenceDtoSchema = PassiveSignalEvidenceSchema;
export type PassiveSignalEvidenceDto = z.infer<typeof PassiveSignalEvidenceDtoSchema>;

export const ArtifactDtoSchema = ArtifactSchema;
export type ArtifactDto = z.infer<typeof ArtifactDtoSchema>;

export const CareerDomainDtoSchema = CareerDomainSchema;
export type CareerDomainDto = z.infer<typeof CareerDomainDtoSchema>;

export const TargetRoleDtoSchema = TargetRoleSchema;
export type TargetRoleDto = z.infer<typeof TargetRoleDtoSchema>;

export const SkillBlueprintDtoSchema = SkillBlueprintSchema;
export type SkillBlueprintDto = z.infer<typeof SkillBlueprintDtoSchema>;

export const CandidateEvidenceProfileDtoSchema = CandidateEvidenceProfileSchema;
export type CandidateEvidenceProfileDto = z.infer<typeof CandidateEvidenceProfileDtoSchema>;

export const SaveOnboardingSelectionRequestSchema = CandidateOnboardingSelectionSchema;
export type SaveOnboardingSelectionRequest = z.infer<typeof SaveOnboardingSelectionRequestSchema>;

export const FrameworkSkillClaimDtoSchema = FrameworkSkillClaimSchema;
export type FrameworkSkillClaimDto = z.infer<typeof FrameworkSkillClaimDtoSchema>;

export const RecommendedSkillsResponseSchema = z.object({
  targetRoleId: z.string().min(1).max(64),
  recommendedSkillIds: z.array(TaxonomySkillCodeSchema),
  optionalSkillIds: z.array(TaxonomySkillCodeSchema),
});
export type RecommendedSkillsResponse = z.infer<typeof RecommendedSkillsResponseSchema>;
