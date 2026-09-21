import type { SkillClaimDto } from '@smart/contracts';

export const SKILL_PROFICIENCY_DISCOVERY_COPY = 'Find out your proficiency';

export function isProjectTaggedSkillClaim(claim: SkillClaimDto): boolean {
  return claim.declareOrigin === 'PROJECT_TAGGED';
}

export function skillClaimOriginHint(claim: SkillClaimDto): string | null {
  if (claim.status === 'VERIFIED') return null;
  if (isProjectTaggedSkillClaim(claim)) {
    return SKILL_PROFICIENCY_DISCOVERY_COPY;
  }
  if (claim.status === 'DECLARED' && !claim.lastAttemptId) {
    return 'Assess to discover your level';
  }
  return null;
}
