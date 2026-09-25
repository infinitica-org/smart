import { z } from 'zod';
import {
  ArtifactSchema,
  CandidateEvidenceProfileSchema,
  CandidateOnboardingSelectionSchema,
  CareerDomainSchema,
  CreateEvidenceRecordSchema,
  CreateVerificationDecisionSchema,
  EvidenceRecordSchema,
  EvidenceReliabilitySchema,
  EvidenceSourceSchema,
  EvidenceStrengthSchema,
  EvidenceTypeSchema,
  EvidenceVerificationStatusSchema,
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

export const AssociateEvidenceWithClaimRequestSchema = z.object({
  claimId: UuidSchema.optional(),
  evidenceIds: z
    .array(UuidSchema)
    .min(1, 'At least one evidence ID must be provided.')
    .max(50, 'Cannot associate more than 50 evidence items at once.')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Duplicate evidence IDs are not allowed in the same request.',
    ),
  weight: z.number().min(0).max(1).optional().default(1),
});
export type AssociateEvidenceWithClaimRequest = z.infer<
  typeof AssociateEvidenceWithClaimRequestSchema
>;

export const SkillClaimEvidenceLinkDtoSchema = z.object({
  linkId: UuidSchema,
  claimId: UuidSchema,
  evidenceId: UuidSchema,
  weight: z.number().min(0).max(1),
  createdAt: IsoDateTimeSchema,
});
export type SkillClaimEvidenceLinkDto = z.infer<typeof SkillClaimEvidenceLinkDtoSchema>;

export const AssociateEvidenceWithClaimResponseSchema = z.object({
  claimId: UuidSchema,
  associatedCount: z.number().int().min(0),
  links: z.array(SkillClaimEvidenceLinkDtoSchema),
  reconciliation: z
    .object({
      contradictionsDetected: z.number().int(),
      reviewRequired: z.boolean(),
    })
    .optional(),
});
export type AssociateEvidenceWithClaimResponse = z.infer<
  typeof AssociateEvidenceWithClaimResponseSchema
>;

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

export const EVIDENCE_PROVENANCE_CATEGORIES = [
  'SELF_DECLARED',
  'SOURCE_VERIFIED',
  'ASSESSED',
  'HUMAN_REVIEWED',
] as const;

export const EvidenceProvenanceCategorySchema = z.enum(EVIDENCE_PROVENANCE_CATEGORIES);
export type EvidenceProvenanceCategory = z.infer<typeof EvidenceProvenanceCategorySchema>;

export const EvidenceProvenanceSummarySchema = z.object({
  SELF_DECLARED: z.number().int().min(0),
  SOURCE_VERIFIED: z.number().int().min(0),
  ASSESSED: z.number().int().min(0),
  HUMAN_REVIEWED: z.number().int().min(0),
});
export type EvidenceProvenanceSummary = z.infer<typeof EvidenceProvenanceSummarySchema>;

export const EvidenceProvenanceItemDtoSchema = z.object({
  evidenceId: UuidSchema,
  evidenceType: EvidenceTypeSchema,
  source: EvidenceSourceSchema,
  verificationStatus: EvidenceVerificationStatusSchema,
  categories: z.array(EvidenceProvenanceCategorySchema),
  claim: z.string().optional(),
  context: z.string().optional(),
  relatedSkillIds: z.array(z.string()).default([]),
  evidenceStrength: EvidenceStrengthSchema.optional(),
  evidenceReliability: EvidenceReliabilitySchema.optional(),
  sourceOwner: z.string().optional(),
  sourceReference: z.string().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type EvidenceProvenanceItemDto = z.infer<typeof EvidenceProvenanceItemDtoSchema>;

export const CandidateEvidenceProvenanceResponseSchema = z.object({
  studentId: UuidSchema,
  total: z.number().int().min(0),
  summary: EvidenceProvenanceSummarySchema,
  items: z.array(EvidenceProvenanceItemDtoSchema),
});
export type CandidateEvidenceProvenanceResponse = z.infer<
  typeof CandidateEvidenceProvenanceResponseSchema
>;

export const EvidenceSkillDisputeRequestSchema = z.object({
  evidenceId: UuidSchema.optional(),
  skillCode: TaxonomySkillCodeSchema,
  reason: z.string().min(8).max(2_000),
});
export type EvidenceSkillDisputeRequest = z.infer<typeof EvidenceSkillDisputeRequestSchema>;

export const EvidenceSkillDisputeResponseSchema = z.object({
  disputeId: UuidSchema,
  evidenceId: UuidSchema.optional(),
  skillCode: TaxonomySkillCodeSchema,
  status: z.literal('UNDER_REVIEW'),
  submittedAt: IsoDateTimeSchema,
});
export type EvidenceSkillDisputeResponse = z.infer<typeof EvidenceSkillDisputeResponseSchema>;

export const ResolveEvidenceDisputeRequestSchema = z.object({
  resolution: z.enum(['ACCEPTED', 'REJECTED']),
  reviewNote: z.string().min(5).max(1_000),
});
export type ResolveEvidenceDisputeRequest = z.infer<typeof ResolveEvidenceDisputeRequestSchema>;

export const ResolveEvidenceDisputeResponseSchema = z.object({
  disputeId: UuidSchema,
  status: z.enum(['RESOLVED_ACCEPTED', 'RESOLVED_REJECTED']),
  reviewedAt: IsoDateTimeSchema,
  reviewerId: UuidSchema,
});
export type ResolveEvidenceDisputeResponse = z.infer<typeof ResolveEvidenceDisputeResponseSchema>;

export const EvidenceSkillDisputeRowSchema = z.object({
  id: UuidSchema,
  studentId: UuidSchema,
  evidenceId: UuidSchema,
  skillCode: TaxonomySkillCodeSchema,
  reason: z.string(),
  status: z.string(),
  reviewedAt: IsoDateTimeSchema.nullable(),
  reviewerId: UuidSchema.nullable(),
  reviewNote: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  evidence: z.any().optional(),
});
export type EvidenceSkillDisputeRow = z.infer<typeof EvidenceSkillDisputeRowSchema>;
