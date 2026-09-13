import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema, WeightSchema } from '../../dto/common.js';
import { SkillProficiencySchema } from '../enums.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import type { SkillClaimDto } from '../../dto/placement.dto.js';
import { SkillClaimStatusSchema } from '../enums.js';

export const FrameworkSkillClaimSchema = z.object({
  claimId: UuidSchema,
  candidateId: UuidSchema,
  skillCode: TaxonomySkillCodeSchema,
  targetProficiency: SkillProficiencySchema,
  status: SkillClaimStatusSchema,
  assessmentResult: z
    .object({
      passed: z.boolean().optional(),
      scorePercent: z.number().min(0).max(100).optional(),
      attemptId: UuidSchema.nullable().optional(),
    })
    .optional(),
  evidenceIds: z.array(UuidSchema).max(100).default([]),
  interviewId: UuidSchema.nullable().optional(),
  confidence: WeightSchema.optional(),
  finalProficiency: SkillProficiencySchema.optional(),
  updatedAt: IsoDateTimeSchema.optional(),
});
export type FrameworkSkillClaim = z.infer<typeof FrameworkSkillClaimSchema>;

export function frameworkSkillClaimFromDto(
  dto: SkillClaimDto,
  candidateId: string,
): FrameworkSkillClaim {
  return {
    claimId: dto.claimId,
    candidateId,
    skillCode: dto.skillCode,
    targetProficiency: dto.proficiency,
    status: dto.status,
    evidenceIds: [],
    interviewId: null,
    confidence: undefined,
    finalProficiency: dto.status === 'VERIFIED' ? dto.proficiency : undefined,
    assessmentResult: dto.lastAttemptId
      ? { attemptId: dto.lastAttemptId, passed: dto.status === 'VERIFIED' }
      : undefined,
  };
}

export function frameworkSkillClaimToDto(claim: FrameworkSkillClaim): SkillClaimDto {
  return {
    claimId: claim.claimId,
    studentId: claim.candidateId,
    skillCode: claim.skillCode,
    proficiency: claim.finalProficiency ?? claim.targetProficiency,
    status: claim.status,
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: claim.assessmentResult?.attemptId ?? null,
  };
}
