import {
  SKILL_INTER_ATTEMPT_COOLDOWN_HOURS,
  SKILL_MAX_ATTEMPTS,
  SKILL_REFRESH_DAYS,
} from '@smart/contracts';
import { addInterAttemptCooldown, addSkillRefreshPeriod } from './skill-claim-state-machine.js';

export type CertAssessmentSnapshot = {
  strikes: number;
  lockedUntil: Date | null;
  lastGenuineFailureAt: Date | null;
  verified: boolean;
  rejected: boolean;
};

export type CertAssessmentEvent =
  | { type: 'START' }
  | { type: 'TECHNICAL_FAILURE' }
  | { type: 'GENUINE_PASS' }
  | { type: 'GENUINE_FAIL' };

export type CertAssessmentBlockReason =
  | 'INTER_ATTEMPT_COOLDOWN'
  | 'LOCKED'
  | 'ALREADY_VERIFIED'
  | 'MAX_ATTEMPTS_REACHED'
  | 'SOURCE_NOT_VERIFIED'
  | 'INVALID_TRANSITION';

export type CertAssessmentTransitionInput = {
  snapshot: CertAssessmentSnapshot;
  event: CertAssessmentEvent;
  now: Date;
  sourceVerified: boolean;
};

export type CertAssessmentTransitionResult = {
  accepted: boolean;
  blockReason: CertAssessmentBlockReason | null;
  next: CertAssessmentSnapshot;
  attemptAllowed: boolean;
  becomesVerified: boolean;
};

function copy(snapshot: CertAssessmentSnapshot): CertAssessmentSnapshot {
  return {
    strikes: snapshot.strikes,
    lockedUntil: snapshot.lockedUntil,
    lastGenuineFailureAt: snapshot.lastGenuineFailureAt,
    verified: snapshot.verified,
    rejected: snapshot.rejected,
  };
}

function allow(
  next: CertAssessmentSnapshot,
  extras: Partial<Pick<CertAssessmentTransitionResult, 'attemptAllowed' | 'becomesVerified'>> = {},
): CertAssessmentTransitionResult {
  return {
    accepted: true,
    blockReason: null,
    next,
    attemptAllowed: extras.attemptAllowed ?? false,
    becomesVerified: extras.becomesVerified ?? false,
  };
}

function reject(
  snapshot: CertAssessmentSnapshot,
  blockReason: CertAssessmentBlockReason,
): CertAssessmentTransitionResult {
  return {
    accepted: false,
    blockReason,
    next: copy(snapshot),
    attemptAllowed: false,
    becomesVerified: false,
  };
}

function interAttemptOpen(lastGenuineFailureAt: Date | null, now: Date): boolean {
  if (!lastGenuineFailureAt) return true;
  return now.getTime() >= addInterAttemptCooldown(lastGenuineFailureAt).getTime();
}

export function certRetryAvailableAt(snapshot: CertAssessmentSnapshot): Date | null {
  if (snapshot.verified) return null;
  if (snapshot.rejected && snapshot.lockedUntil) return snapshot.lockedUntil;
  if (snapshot.lastGenuineFailureAt) {
    return addInterAttemptCooldown(snapshot.lastGenuineFailureAt);
  }
  return null;
}

function bumpStrike(strikes: number): number {
  return Math.min(strikes + 1, SKILL_MAX_ATTEMPTS);
}

function applyStart(
  snapshot: CertAssessmentSnapshot,
  now: Date,
  sourceVerified: boolean,
): CertAssessmentTransitionResult {
  if (!sourceVerified) return reject(snapshot, 'SOURCE_NOT_VERIFIED');
  if (snapshot.verified) return reject(snapshot, 'ALREADY_VERIFIED');
  if (snapshot.rejected) {
    if (snapshot.lockedUntil && now.getTime() < snapshot.lockedUntil.getTime()) {
      return reject(snapshot, 'LOCKED');
    }
    return reject(snapshot, 'MAX_ATTEMPTS_REACHED');
  }
  if (snapshot.strikes >= SKILL_MAX_ATTEMPTS) {
    return reject(snapshot, 'MAX_ATTEMPTS_REACHED');
  }
  if (!interAttemptOpen(snapshot.lastGenuineFailureAt, now)) {
    return reject(snapshot, 'INTER_ATTEMPT_COOLDOWN');
  }
  return allow(copy(snapshot), { attemptAllowed: true });
}

function applyTechnicalFailure(snapshot: CertAssessmentSnapshot): CertAssessmentTransitionResult {
  if (snapshot.verified) return reject(snapshot, 'ALREADY_VERIFIED');
  if (snapshot.rejected) return reject(snapshot, 'LOCKED');
  return allow(copy(snapshot));
}

function applyGenuinePass(
  snapshot: CertAssessmentSnapshot,
  sourceVerified: boolean,
): CertAssessmentTransitionResult {
  if (!sourceVerified) return reject(snapshot, 'SOURCE_NOT_VERIFIED');
  if (snapshot.verified) return reject(snapshot, 'ALREADY_VERIFIED');
  return allow(
    {
      ...copy(snapshot),
      verified: true,
      lockedUntil: null,
      lastGenuineFailureAt: null,
    },
    { becomesVerified: true },
  );
}

function applyGenuineFail(
  snapshot: CertAssessmentSnapshot,
  now: Date,
): CertAssessmentTransitionResult {
  if (snapshot.verified) return reject(snapshot, 'ALREADY_VERIFIED');
  const nextStrikes = bumpStrike(snapshot.strikes);
  if (nextStrikes >= SKILL_MAX_ATTEMPTS) {
    return allow({
      strikes: nextStrikes,
      lockedUntil: addSkillRefreshPeriod(now),
      lastGenuineFailureAt: now,
      verified: false,
      rejected: true,
    });
  }
  return allow({
    strikes: nextStrikes,
    lockedUntil: null,
    lastGenuineFailureAt: now,
    verified: false,
    rejected: false,
  });
}

export function applyCertAssessmentTransition(
  input: CertAssessmentTransitionInput,
): CertAssessmentTransitionResult {
  const { snapshot, event, now, sourceVerified } = input;
  switch (event.type) {
    case 'START':
      return applyStart(snapshot, now, sourceVerified);
    case 'TECHNICAL_FAILURE':
      return applyTechnicalFailure(snapshot);
    case 'GENUINE_PASS':
      return applyGenuinePass(snapshot, sourceVerified);
    case 'GENUINE_FAIL':
      return applyGenuineFail(snapshot, now);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function certAssessmentCooldownHours(): number {
  return SKILL_INTER_ATTEMPT_COOLDOWN_HOURS;
}

export function certAssessmentRefreshDays(): number {
  return SKILL_REFRESH_DAYS;
}
