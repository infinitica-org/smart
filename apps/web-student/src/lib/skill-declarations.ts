import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  hydrateFocusProgress,
  focusProgressFor,
  retryAvailableAtForFocus,
  type SkillCategoryId,
  type SkillFocusProgress,
  type SkillProficiency,
  resolveSkillFocus,
  sdeV4FormCodeForCatalogSkill,
  type SkillClaimDto,
  type SkillClaimStatus,
  proficiencyLevelUiLabel,
  SKILL_PROFICIENCIES,
} from '@smart/contracts';
import { canVerifySkills } from './profile-progress';

export const SOFTWARE_IT_DOMAIN_LABEL = 'Software & IT';

export const CATEGORY_LABELS: Record<SkillCategoryId, string> = Object.fromEntries(
  SKILL_CATEGORY_IDS.map((id) => [id, SKILL_CATEGORIES[id].name]),
) as Record<SkillCategoryId, string>;

export const PROFICIENCY_OPTIONS = [
  ...SKILL_PROFICIENCIES,
] as const satisfies readonly SkillProficiency[];

export const PROFICIENCY_LABELS: Record<string, string> = Object.fromEntries(
  SKILL_PROFICIENCIES.map((level) => [level, proficiencyLevelUiLabel(level)]),
);

export function skillsForCategory(categoryId: SkillCategoryId) {
  return SKILL_DEFINITIONS.filter((skill) => skill.categoryId === categoryId);
}

export function skillNameForCode(skillCode: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === skillCode)?.name ?? skillCode;
}

export function categoryNameForCode(skillCode: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === skillCode)?.categoryName ?? skillCode;
}

export const SKILL_VERIFY_STAGE_LABELS = {
  DIAGNOSTIC: 'Short diagnostic',
  COMPLETE: 'Assessment',
  INTERVIEW: 'Defense interview',
} as const;

export type SkillVerifyStageLabel = keyof typeof SKILL_VERIFY_STAGE_LABELS;

export function formatSkillVerifyKioskTitle(
  skillCode: string,
  stage?: SkillVerifyStageLabel | null,
): string {
  const name = skillNameForCode(skillCode);
  if (!stage) return name;
  const label = SKILL_VERIFY_STAGE_LABELS[stage];
  return label ? `${name} · ${label}` : name;
}

export function proficiencyLabelForClaim(claim: SkillClaimDto): string | null {
  if (claim.status === 'VERIFIED' && claim.proficiency) {
    return PROFICIENCY_LABELS[claim.proficiency] ?? claim.proficiency;
  }
  return null;
}

export function isSdeV4Verifiable(skillCode: string): boolean {
  return sdeV4FormCodeForCatalogSkill(skillCode) !== null;
}

export function claimToBadgeStatus(claim: SkillClaimDto): string {
  if (claim.status === 'LOCKED') return 'LOCKED';
  if (claim.verificationInProgress) return 'PENDING_REVIEW';
  if (claim.status === 'VERIFIED' && claim.verificationDecision === 'PROVISIONAL') {
    return 'PROVISIONAL';
  }
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
    return 'This skill does not have a verification challenge yet.';
  }
  if (claim.verificationInProgress) {
    return 'Your assessment is under review. You can start again once processing finishes.';
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
  const underReview = claim?.verificationInProgress === true;
  const canStart =
    hasForm &&
    !cooling &&
    !underReview &&
    (status === 'DECLARED' || status === 'BEGINNER_REATTEMPT');
  const canEditProficiency =
    !cooling && (status === 'DECLARED' || status === 'BEGINNER_REATTEMPT' || !claim);
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
    canEditProficiency,
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

export type RepositoryStatusLabel =
  | 'Not declared'
  | 'Declared'
  | 'Under review'
  | 'Verified'
  | 'Not verified'
  | 'Locked'
  | 'Reattempting';

/** Human-readable repository status for a catalog skill with an optional claim. */
export function repositoryStatusForClaim(claim?: SkillClaimDto | null): {
  displayLabel: RepositoryStatusLabel;
  badgeStatus: string | null;
} {
  if (!claim) {
    return { displayLabel: 'Not declared', badgeStatus: null };
  }
  const badge = claimToBadgeStatus(claim);
  if (badge === 'VERIFIED') {
    return { displayLabel: 'Verified', badgeStatus: 'VERIFIED' };
  }
  if (badge === 'DECLARED') {
    return { displayLabel: 'Declared', badgeStatus: 'DECLARED' };
  }
  if (badge === 'PENDING_REVIEW') {
    return { displayLabel: 'Under review', badgeStatus: 'PENDING_REVIEW' };
  }
  if (badge === 'NOT_VERIFIED') {
    return { displayLabel: 'Not verified', badgeStatus: 'NOT_VERIFIED' };
  }
  if (badge === 'LOCKED') {
    return { displayLabel: 'Locked', badgeStatus: 'LOCKED' };
  }
  if (claim.status === 'BEGINNER_REATTEMPT') {
    return { displayLabel: 'Reattempting', badgeStatus: 'BEGINNER_REATTEMPT' };
  }
  return { displayLabel: 'Declared', badgeStatus: badge };
}

export const SKILL_VERIFICATION_PROFILE_UNLOCK_MESSAGE =
  'Complete your profile to unlock skill verification.';

/** Default claim proficiency for diagnostic-first verification (candidate does not self-select). */
export const SKILL_VERIFICATION_DIAGNOSTIC_PROFICIENCY: SkillProficiency = 'BEGINNER';

/** Student-facing copy — high level only (no item formats or gating mechanics). */
export const SKILL_VERIFICATION_ASSESSMENT_SUMMARY =
  'You complete a timed, proctored assessment for the skill you selected. Your result reflects what you demonstrated in that session; linked profile evidence is shown below when you have it.';

export function isProfileCompleteForSkillVerification(percent: number | null | undefined): boolean {
  return canVerifySkills(percent);
}

export function canEnableTakeAssessment(params: {
  profilePercent: number | null | undefined;
}): boolean {
  return isProfileCompleteForSkillVerification(params.profilePercent);
}

/** Block message for Take Assessment (verified skills use the repository detail view only). */
export function takeAssessmentBlockMessage(claim?: SkillClaimDto | null): string | null {
  if (!claim) return null;
  const message = skillVerifyBlockMessage(claim);
  if (message === 'This skill is already verified.') return null;
  return message;
}
