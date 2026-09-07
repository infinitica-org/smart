import {
  SKILL_DEFINITIONS,
  hydrateFocusProgress,
  focusProgressFor,
  retryAvailableAtForFocus,
  type SkillFocusProgress,
  resolveSkillFocus,
  sdeV4FormCodeForCatalogSkill,
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

/** INF-05: Universal Core plus the chosen role stream (core loads for every stream). */
export function mandatorySkillsForStream(stream: SkillStream) {
  const universal = skillsForStream('UNIVERSAL');
  if (stream === 'UNIVERSAL') return universal;
  const seen = new Set(universal.map((skill) => skill.code));
  const extra = skillsForStream(stream).filter((skill) => {
    if (seen.has(skill.code)) return false;
    seen.add(skill.code);
    return true;
  });
  return [...universal, ...extra];
}

export function skillNameForCode(skillCode: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === skillCode)?.name ?? skillCode;
}

export function isSdeV4Verifiable(skillCode: string): boolean {
  return sdeV4FormCodeForCatalogSkill(skillCode) !== null;
}

/**
 * Map persisted SkillClaimStatus onto VerificationBadge statuses.
 * After a sit, fail/retry states show as Not verified; pass shows Verified.
 */
export function claimToBadgeStatus(claim: SkillClaimDto): string {
  if (claim.status === 'LOCKED') return 'LOCKED';
  if (claim.status === 'VERIFIED') return 'VERIFIED';
  if (claim.status === 'BEGINNER_REATTEMPT') return 'NOT_VERIFIED';
  if (claim.status === 'DECLARED' && claim.lastAttemptId) return 'NOT_VERIFIED';
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

export function formatRetryAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isSkillVerifyCooldownActive(claim: SkillClaimDto, now = Date.now()): boolean {
  if (!claim.retryAvailableAt) return false;
  return Date.parse(claim.retryAvailableAt) > now;
}

export function skillVerifyBlockMessage(claim: SkillClaimDto): string | null {
  if (!isSdeV4Verifiable(claim.skillCode)) {
    return 'This skill does not have a verification assessment yet.';
  }
  if (claim.status === 'VERIFIED') {
    return 'This skill is already verified.';
  }
  if (claim.status === 'LOCKED') {
    const until = formatRetryAt(claim.retryAvailableAt ?? claim.lockedUntil);
    return until ? `This skill is locked until ${until}.` : 'This skill is locked.';
  }
  if (isSkillVerifyCooldownActive(claim)) {
    const until = formatRetryAt(claim.retryAvailableAt);
    return until
      ? `You already sat this focus. You can verify it again after ${until}.`
      : 'You already sat this focus. Wait for the cooldown to end.';
  }
  return null;
}

function asFocusProgress(rows: NonNullable<SkillClaimDto['focusProgress']>): SkillFocusProgress[] {
  return rows.map((row) => ({
    focus: row.focus,
    status: row.status,
    strikes: row.strikes,
    lockedUntil: row.lockedUntil,
    lastAttemptId: row.lastAttemptId,
    lastGenuineFailureAt: row.lastGenuineFailureAt ?? null,
    retryAvailableAt:
      row.retryAvailableAt ??
      retryAvailableAtForFocus(row.status, row.lockedUntil, row.lastGenuineFailureAt ?? null),
  }));
}

export function progressForClaim(claim: SkillClaimDto): SkillFocusProgress[] {
  if (claim.focusProgress && claim.focusProgress.length > 0) {
    return asFocusProgress(claim.focusProgress);
  }
  const rows = hydrateFocusProgress({
    skillCode: claim.skillCode,
    metadata: { skillFocus: claim.skillFocus ?? undefined },
    status: claim.status,
    strikes: claim.strikes,
    lockedUntil: claim.lockedUntil,
    lastAttemptId: claim.lastAttemptId,
    lastGenuineFailureAt: null,
  });
  if (rows[0] && claim.retryAvailableAt) {
    return [{ ...rows[0], retryAvailableAt: claim.retryAvailableAt }];
  }
  return rows;
}

export function viewForFocus(
  claim: SkillClaimDto | undefined,
  skillCode: string,
  focus: string | undefined,
  now = Date.now(),
) {
  const selected = resolveSkillFocus(skillCode, focus);
  const row = claim && selected ? focusProgressFor(progressForClaim(claim), selected) : null;
  const status = row?.status ?? claim?.status ?? 'DECLARED';
  const retryAt =
    row?.retryAvailableAt ??
    claim?.retryAvailableAt ??
    row?.lockedUntil ??
    claim?.lockedUntil ??
    null;
  const waitOpen =
    typeof retryAt === 'string' &&
    Number.isFinite(Date.parse(retryAt)) &&
    Date.parse(retryAt) > now;
  const cooling = status !== 'VERIFIED' && (waitOpen || status === 'LOCKED');
  const hasForm = isSdeV4Verifiable(skillCode);
  const canStart =
    hasForm && !cooling && (status === 'DECLARED' || status === 'BEGINNER_REATTEMPT');
  const synthetic: SkillClaimDto | undefined = claim
    ? {
        ...claim,
        status,
        lockedUntil: row?.lockedUntil ?? null,
        lastAttemptId: row?.lastAttemptId ?? null,
        retryAvailableAt: retryAt,
        skillFocus: selected,
      }
    : undefined;
  return {
    selected,
    status,
    badge: synthetic ? claimToBadgeStatus(synthetic) : 'DECLARED',
    canStart,
    cooling,
    retryAt: cooling ? retryAt : null,
    canEditProficiency: !row || status === 'DECLARED',
    hasForm,
    blockMessage: synthetic ? skillVerifyBlockMessage(synthetic) : null,
  };
}

export function canStartSdeV4Verify(
  claim: SkillClaimDto,
  now = Date.now(),
  focus?: string,
): boolean {
  return viewForFocus(claim, claim.skillCode, focus ?? claim.skillFocus ?? undefined, now).canStart;
}

export function isClaimActive(status: SkillClaimStatus): boolean {
  return status !== 'LOCKED';
}
