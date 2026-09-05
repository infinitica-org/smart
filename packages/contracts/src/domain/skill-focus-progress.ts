import { SKILL_INTER_ATTEMPT_COOLDOWN_HOURS, type SkillClaimStatus } from './enums.js';
import { resolveSkillFocus, skillFocusFromMetadata } from './sde-v4-bridge.js';

const MS_PER_HOUR = 60 * 60 * 1000;

export type SkillFocusProgress = {
  focus: string;
  status: SkillClaimStatus;
  strikes: number;
  lockedUntil: string | null;
  lastAttemptId: string | null;
  lastGenuineFailureAt: string | null;
  retryAvailableAt: string | null;
};

function addCooldown(fromIso: string): string {
  return new Date(
    Date.parse(fromIso) + SKILL_INTER_ATTEMPT_COOLDOWN_HOURS * MS_PER_HOUR,
  ).toISOString();
}

export function retryAvailableAtForFocus(
  status: SkillClaimStatus,
  lockedUntil: string | null,
  lastGenuineFailureAt: string | null,
): string | null {
  if (status === 'LOCKED') return lockedUntil;
  if (status === 'BEGINNER_REATTEMPT' && lastGenuineFailureAt) {
    return addCooldown(lastGenuineFailureAt);
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseOne(raw: unknown): SkillFocusProgress | null {
  const row = asRecord(raw);
  if (!row || typeof row.focus !== 'string' || row.focus.trim().length === 0) return null;
  const status = row.status;
  if (
    status !== 'DECLARED' &&
    status !== 'VERIFIED' &&
    status !== 'BEGINNER_REATTEMPT' &&
    status !== 'LOCKED'
  ) {
    return null;
  }
  const lastFail = typeof row.lastGenuineFailureAt === 'string' ? row.lastGenuineFailureAt : null;
  const lockedUntil = typeof row.lockedUntil === 'string' ? row.lockedUntil : null;
  const progress: SkillFocusProgress = {
    focus: row.focus.trim().slice(0, 64),
    status,
    strikes: typeof row.strikes === 'number' ? row.strikes : 0,
    lockedUntil,
    lastAttemptId: typeof row.lastAttemptId === 'string' ? row.lastAttemptId : null,
    lastGenuineFailureAt: lastFail,
    retryAvailableAt: retryAvailableAtForFocus(status, lockedUntil, lastFail),
  };
  return progress;
}

export function readFocusProgress(metadata: unknown): SkillFocusProgress[] {
  const root = asRecord(metadata);
  const list = root?.focusProgress;
  if (!Array.isArray(list)) return [];
  return list.map(parseOne).filter((row): row is SkillFocusProgress => row !== null);
}

export function hydrateFocusProgress(input: {
  skillCode: string;
  metadata: unknown;
  status: SkillClaimStatus;
  strikes: number;
  lockedUntil: string | null;
  lastAttemptId: string | null;
  lastGenuineFailureAt: string | null;
}): SkillFocusProgress[] {
  const existing = readFocusProgress(input.metadata);
  if (existing.length > 0) {
    return existing.map((row) => ({
      ...row,
      retryAvailableAt: retryAvailableAtForFocus(
        row.status,
        row.lockedUntil,
        row.lastGenuineFailureAt,
      ),
    }));
  }
  const focus = resolveSkillFocus(input.skillCode, skillFocusFromMetadata(input.metadata));
  if (!focus) return [];
  return [
    {
      focus,
      status: input.status,
      strikes: input.strikes,
      lockedUntil: input.lockedUntil,
      lastAttemptId: input.lastAttemptId,
      lastGenuineFailureAt: input.lastGenuineFailureAt,
      retryAvailableAt: retryAvailableAtForFocus(
        input.status,
        input.lockedUntil,
        input.lastGenuineFailureAt,
      ),
    },
  ];
}

export function focusProgressFor(
  rows: readonly SkillFocusProgress[],
  focus: string | null | undefined,
): SkillFocusProgress | null {
  if (!focus) return null;
  return rows.find((row) => row.focus === focus) ?? null;
}

export function upsertFocusProgress(
  rows: readonly SkillFocusProgress[],
  next: SkillFocusProgress,
): SkillFocusProgress[] {
  const others = rows.filter((row) => row.focus !== next.focus);
  return [...others, next];
}

export function mergeFocusProgressIntoMetadata(
  metadata: unknown,
  skillFocus: string | null,
  progress: readonly SkillFocusProgress[],
): Record<string, unknown> {
  const root = asRecord(metadata) ?? {};
  return {
    ...root,
    ...(skillFocus ? { skillFocus } : {}),
    focusProgress: progress.map((row) => ({
      focus: row.focus,
      status: row.status,
      strikes: row.strikes,
      lockedUntil: row.lockedUntil,
      lastAttemptId: row.lastAttemptId,
      lastGenuineFailureAt: row.lastGenuineFailureAt,
    })),
  };
}
