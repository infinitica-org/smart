import {
  SKILL_INTER_ATTEMPT_COOLDOWN_HOURS,
  SKILL_MAX_ATTEMPTS,
  SKILL_REFRESH_DAYS,
  type SkillClaimStatus,
  type SkillProficiency,
} from '@smart/contracts';

/**
 * SE-T01 skill-claim state machine (ADR 0013 + contracts).
 *
 * Persisted statuses are only DECLARED | VERIFIED | BEGINNER_REATTEMPT | LOCKED.
 * UI labels (In verification, Demoted, Verified-Beginner, Cooldown) are derived,
 * never stored as extra enum values.
 *
 * Time math is isolated here. Durations come from `@smart/contracts` only.
 * Refresh uses 24-hour multiples of SKILL_REFRESH_DAYS (not Skill.cooldownDays /
 * validityDays). Civil-calendar / timezone rules are pending product clarification.
 *
 * Retry item bank (PRD Beginner track vs playbook same-tier gate) is NOT resolved
 * here — see RETRY_ITEM_SCOPE.
 *
 * Re-declaration after lock (LOCKED → DECLARED) is CN-T04. This machine never
 * auto-resets on clock expiry.
 *
 * Persistence wiring: POST /assessment/complete closes the Attempt and emits
 * smart.assessment.submitted. Skill-claim transitions are not applied there —
 * callers must apply this function inside a future finalize transaction; do not
 * invent a second assessment runner (INF-06 owns skill-linked items).
 */

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Isolated duration helpers — change only these if product picks calendar days
 * instead of 24-hour multiples.
 */
export function addSkillRefreshPeriod(from: Date): Date {
  return new Date(from.getTime() + SKILL_REFRESH_DAYS * MS_PER_DAY);
}

export function addInterAttemptCooldown(from: Date): Date {
  return new Date(from.getTime() + SKILL_INTER_ATTEMPT_COOLDOWN_HOURS * MS_PER_HOUR);
}

/**
 * PRD §7.3 retry is the Beginner track; playbook §5.6 flowchart loops the same
 * proficiency gate. Do not pick a bank here.
 */
export const RETRY_ITEM_SCOPE = 'BEGINNER_TRACK_PENDING_CLARIFICATION' as const;
export type RetryItemScope = typeof RETRY_ITEM_SCOPE;

export type SkillClaimSnapshot = {
  status: SkillClaimStatus;
  proficiency: SkillProficiency;
  strikes: number;
  lockedUntil: Date | null;
  verifiedUntil: Date | null;
};

export type SkillClaimEvent =
  | { type: 'START' }
  | { type: 'TECHNICAL_FAILURE' }
  | { type: 'GENUINE_PASS' }
  | { type: 'GENUINE_FAIL' };

export type SkillClaimBlockReason =
  | 'INTER_ATTEMPT_COOLDOWN'
  | 'LOCKED'
  | 'LOCK_EXPIRED_REDECLARE_REQUIRED'
  | 'ALREADY_VERIFIED'
  | 'MAX_ATTEMPTS_REACHED'
  | 'INVALID_TRANSITION';

export type SkillClaimTransitionInput = {
  claim: SkillClaimSnapshot;
  event: SkillClaimEvent;
  now: Date;
  /** Genuine fail timestamp of attempt 1. Required to enforce the 48h gate. */
  lastGenuineFailureAt: Date | null;
};

export type SkillClaimTransitionResult = {
  accepted: boolean;
  blockReason: SkillClaimBlockReason | null;
  next: SkillClaimSnapshot;
  attemptAllowed: boolean;
  retryItemScope: RetryItemScope | null;
};

function copyClaim(claim: SkillClaimSnapshot): SkillClaimSnapshot {
  return {
    status: claim.status,
    proficiency: claim.proficiency,
    strikes: claim.strikes,
    lockedUntil: claim.lockedUntil,
    verifiedUntil: claim.verifiedUntil,
  };
}

function bumpStrike(strikes: number): number {
  return Math.min(strikes + 1, SKILL_MAX_ATTEMPTS);
}

function allow(
  next: SkillClaimSnapshot,
  extras: Partial<Pick<SkillClaimTransitionResult, 'attemptAllowed' | 'retryItemScope'>> = {},
): SkillClaimTransitionResult {
  return {
    accepted: true,
    blockReason: null,
    next,
    attemptAllowed: extras.attemptAllowed ?? false,
    retryItemScope: extras.retryItemScope ?? null,
  };
}

function reject(
  claim: SkillClaimSnapshot,
  blockReason: SkillClaimBlockReason,
): SkillClaimTransitionResult {
  return {
    accepted: false,
    blockReason,
    next: copyClaim(claim),
    attemptAllowed: false,
    retryItemScope: null,
  };
}

function interAttemptOpen(lastGenuineFailureAt: Date | null, now: Date): boolean {
  if (!lastGenuineFailureAt) return false;
  return now.getTime() >= addInterAttemptCooldown(lastGenuineFailureAt).getTime();
}

/** When the student may sit this claim again. Null means no extra wait beyond status. */
export function skillRetryAvailableAt(
  status: SkillClaimStatus,
  lockedUntil: Date | null,
  lastGenuineFailureAt: Date | null,
): Date | null {
  if (status === 'VERIFIED') return null;
  if (status === 'LOCKED') return lockedUntil;
  if (lastGenuineFailureAt) return addInterAttemptCooldown(lastGenuineFailureAt);
  return null;
}

function applyStart(
  claim: SkillClaimSnapshot,
  now: Date,
  lastGenuineFailureAt: Date | null,
): SkillClaimTransitionResult {
  switch (claim.status) {
    case 'DECLARED':
      if (lastGenuineFailureAt && !interAttemptOpen(lastGenuineFailureAt, now)) {
        return reject(claim, 'INTER_ATTEMPT_COOLDOWN');
      }
      return allow(copyClaim(claim), { attemptAllowed: true });
    case 'BEGINNER_REATTEMPT':
      if (!interAttemptOpen(lastGenuineFailureAt, now)) {
        return reject(claim, 'INTER_ATTEMPT_COOLDOWN');
      }
      return allow(copyClaim(claim), {
        attemptAllowed: true,
        retryItemScope: RETRY_ITEM_SCOPE,
      });
    case 'LOCKED': {
      if (claim.lockedUntil && now.getTime() >= claim.lockedUntil.getTime()) {
        return reject(claim, 'LOCK_EXPIRED_REDECLARE_REQUIRED');
      }
      return reject(claim, 'LOCKED');
    }
    case 'VERIFIED':
      return reject(claim, 'ALREADY_VERIFIED');
    default: {
      const _exhaustive: never = claim.status;
      return _exhaustive;
    }
  }
}

function applyTechnicalFailure(claim: SkillClaimSnapshot): SkillClaimTransitionResult {
  if (claim.status === 'LOCKED' || claim.status === 'VERIFIED') {
    return reject(claim, claim.status === 'LOCKED' ? 'LOCKED' : 'ALREADY_VERIFIED');
  }
  return allow(copyClaim(claim));
}

function applyGenuinePass(claim: SkillClaimSnapshot, now: Date): SkillClaimTransitionResult {
  if (claim.status === 'DECLARED') {
    return allow({
      status: 'VERIFIED',
      proficiency: claim.proficiency,
      strikes: claim.strikes,
      lockedUntil: null,
      verifiedUntil: addSkillRefreshPeriod(now),
    });
  }
  if (claim.status === 'BEGINNER_REATTEMPT') {
    return allow({
      status: 'VERIFIED',
      proficiency: 'BEGINNER',
      strikes: claim.strikes,
      lockedUntil: null,
      verifiedUntil: addSkillRefreshPeriod(now),
    });
  }
  if (claim.status === 'LOCKED') {
    return reject(claim, 'MAX_ATTEMPTS_REACHED');
  }
  return reject(claim, 'ALREADY_VERIFIED');
}

function applyGenuineFail(claim: SkillClaimSnapshot, now: Date): SkillClaimTransitionResult {
  if (claim.status === 'DECLARED') {
    return allow(
      {
        status: 'BEGINNER_REATTEMPT',
        proficiency: claim.proficiency,
        strikes: bumpStrike(claim.strikes),
        lockedUntil: null,
        verifiedUntil: claim.verifiedUntil,
      },
      { retryItemScope: RETRY_ITEM_SCOPE },
    );
  }
  if (claim.status === 'BEGINNER_REATTEMPT') {
    return allow({
      status: 'LOCKED',
      proficiency: claim.proficiency,
      strikes: bumpStrike(claim.strikes),
      lockedUntil: addSkillRefreshPeriod(now),
      verifiedUntil: null,
    });
  }
  if (claim.status === 'LOCKED') {
    return reject(claim, 'MAX_ATTEMPTS_REACHED');
  }
  return reject(claim, 'INVALID_TRANSITION');
}

export function applySkillClaimTransition(
  input: SkillClaimTransitionInput,
): SkillClaimTransitionResult {
  const { claim, event, now, lastGenuineFailureAt } = input;
  switch (event.type) {
    case 'START':
      return applyStart(claim, now, lastGenuineFailureAt);
    case 'TECHNICAL_FAILURE':
      return applyTechnicalFailure(claim);
    case 'GENUINE_PASS':
      return applyGenuinePass(claim, now);
    case 'GENUINE_FAIL':
      return applyGenuineFail(claim, now);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
