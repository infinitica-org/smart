import {
  SKILL_DEFINITIONS,
  type SkillClaimDto,
  type SkillClaimStatus,
  type SkillProficiency,
  type SkillStream,
} from '@smart/contracts';

export const SOFTWARE_IT_DOMAIN_LABEL = 'Software & IT';

export const STREAM_LABELS: Record<SkillStream, string> = {
  UNIVERSAL: 'Universal Core',
  SOFTWARE_DEVELOPMENT: 'Software Development',
  DATA_SCIENCE_ANALYTICS: 'Data Science & Analytics',
  AI_ML_ENGINEERING: 'AI/ML Engineering',
};

/** Matches @smart/contracts SkillProficiencySchema (no PROFESSIONAL on claims). */
export const PROFICIENCY_OPTIONS: readonly SkillProficiency[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
] as const;

export const PROFICIENCY_LABELS: Record<SkillProficiency, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function skillsForStream(stream: SkillStream) {
  return SKILL_DEFINITIONS.filter((s) => s.domain === 'SOFTWARE_IT' && s.stream === stream);
}

export function skillNameForCode(skillCode: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === skillCode)?.name ?? skillCode;
}

/**
 * Map persisted SkillClaimStatus (+ attempt hint) onto VerificationBadge statuses.
 * SE-T01: "In verification" is UI-only — BEGINNER_REATTEMPT or an in-flight attempt.
 */
export function claimToBadgeStatus(claim: SkillClaimDto): string {
  if (claim.status === 'LOCKED') return 'LOCKED';
  if (claim.status === 'VERIFIED') return 'VERIFIED';
  if (claim.status === 'BEGINNER_REATTEMPT') return 'IN_VERIFICATION';
  if (claim.status === 'DECLARED' && claim.lastAttemptId) return 'IN_VERIFICATION';
  return 'DECLARED';
}

export function formatCooldown(lockedUntil: string | null): string | null {
  if (!lockedUntil) return null;
  const parsed = new Date(lockedUntil);
  if (Number.isNaN(parsed.getTime())) return lockedUntil;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isClaimActive(status: SkillClaimStatus): boolean {
  return status !== 'LOCKED';
}
