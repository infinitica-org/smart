import {
  PolymorphicAssessmentSessionDtoSchema,
  type CandidateCertificateStatus,
  type PolymorphicAssessmentSessionDto,
  type SharedVerificationStatus,
  type SkillClaimStatus,
} from '@smart/contracts';

/**
 * Maps domain skill claim status + active session info to the canonical
 * SHARED_VERIFICATION_STATUSES vocabulary ('unverified' | 'in_progress' | 'verified' | 'rejected' | 'voided').
 */
export function mapSkillClaimToSharedVerificationStatus(
  status: SkillClaimStatus,
  hasActiveSession = false,
  isVoided = false,
): SharedVerificationStatus {
  if (isVoided) return 'voided';
  if (hasActiveSession) return 'in_progress';
  switch (status) {
    case 'DECLARED':
    case 'BEGINNER_REATTEMPT':
      return 'unverified';
    case 'VERIFIED':
      return 'verified';
    case 'LOCKED':
      return 'rejected';
  }
}

/**
 * Maps CandidateCertificate status to SHARED_VERIFICATION_STATUSES vocabulary.
 */
export function mapCandidateCertificateToSharedVerificationStatus(
  status: CandidateCertificateStatus,
  hasActiveSession = false,
): SharedVerificationStatus {
  if (hasActiveSession) return 'in_progress';
  switch (status) {
    case 'DECLARED':
    case 'UPLOADED':
      return 'unverified';
    case 'IN_VERIFICATION':
      return 'in_progress';
    case 'VERIFIED':
      return 'verified';
    case 'REJECTED':
      return 'rejected';
  }
}

export type BuildSkillPolymorphicSessionInput = {
  sessionId: string;
  claimId: string;
  status: SkillClaimStatus;
  hasActiveSession?: boolean;
  isVoided?: boolean;
  retryAvailableAt?: Date | string | null;
  lockedUntil?: Date | string | null;
  expiresAt?: Date | string | null;
  serverRemainingSeconds?: number;
};

export function buildSkillPolymorphicSession(
  input: BuildSkillPolymorphicSessionInput,
): PolymorphicAssessmentSessionDto {
  const status = mapSkillClaimToSharedVerificationStatus(
    input.status,
    input.hasActiveSession,
    input.isVoided,
  );

  return PolymorphicAssessmentSessionDtoSchema.parse({
    sessionId: input.sessionId,
    assessableType: 'SKILL',
    assessableId: input.claimId,
    status,
    retryAvailableAt: input.retryAvailableAt
      ? new Date(input.retryAvailableAt).toISOString()
      : undefined,
    lockedUntil: input.lockedUntil ? new Date(input.lockedUntil).toISOString() : undefined,
    expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : undefined,
    serverRemainingSeconds: input.serverRemainingSeconds,
  });
}

export type BuildCertificationPolymorphicSessionInput = {
  sessionId: string;
  certificateId: string;
  status: CandidateCertificateStatus;
  hasActiveSession?: boolean;
  retryAvailableAt?: Date | string | null;
  lockedUntil?: Date | string | null;
  expiresAt?: Date | string | null;
  serverRemainingSeconds?: number;
};

export function buildCertificationPolymorphicSession(
  input: BuildCertificationPolymorphicSessionInput,
): PolymorphicAssessmentSessionDto {
  const status = mapCandidateCertificateToSharedVerificationStatus(
    input.status,
    input.hasActiveSession,
  );

  return PolymorphicAssessmentSessionDtoSchema.parse({
    sessionId: input.sessionId,
    assessableType: 'CERTIFICATION',
    assessableId: input.certificateId,
    status,
    retryAvailableAt: input.retryAvailableAt
      ? new Date(input.retryAvailableAt).toISOString()
      : undefined,
    lockedUntil: input.lockedUntil ? new Date(input.lockedUntil).toISOString() : undefined,
    expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : undefined,
    serverRemainingSeconds: input.serverRemainingSeconds,
  });
}
