import {
  TRACK_CODES,
  type AttemptSessionDto,
  type DeliverableItemDto,
  type SaveDraftRequest,
  type TrackCode,
} from '@smart/contracts';
import { isSmartApiError, SmartNetworkError } from '@smart/api-client';

export const L1_LEVEL_NUMBER = 1 as const;
/** Stay under the 10 req/min submit-l1 budget (one save per 6s). */
export const L1_AUTOSAVE_MS = 8_000;

/** Live api-core unless NEXT_PUBLIC_MOCK_API is exactly "true". */
export function isMockApiEnabled(flag: string | undefined): boolean {
  return flag === 'true';
}

export type PlayerErrorKind =
  'level_locked' | 'not_found' | 'rate_limit' | 'forbidden' | 'network' | 'unknown';

export type PlayerError = {
  kind: PlayerErrorKind;
  message: string;
  retryAfterSeconds?: number;
};

export function isTrackCode(value: string | null | undefined): value is TrackCode {
  return typeof value === 'string' && (TRACK_CODES as readonly string[]).includes(value);
}

/** Only the enrolled primary track. Never invent one from the catalog. */
export function resolveL1TrackCode(me: { primaryTrack: string | null }): TrackCode | null {
  return isTrackCode(me.primaryTrack) ? me.primaryTrack : null;
}

export const L1_LAST_ATTEMPT_STORAGE_KEY = 'smart.l1.lastAttemptId';

export function readLastL1AttemptId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(L1_LAST_ATTEMPT_STORAGE_KEY);
    return value && /^[0-9a-f-]{36}$/iu.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLastL1AttemptId(attemptId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(L1_LAST_ATTEMPT_STORAGE_KEY, attemptId);
  } catch {
    // Private mode / quota — resume falls back to idempotent start.
  }
}

export function clearLastL1AttemptId(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(L1_LAST_ATTEMPT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function isInProgressSession(session: AttemptSessionDto): boolean {
  return session.status === 'IN_PROGRESS';
}

/** Expired or server-locked, but the attempt is still closable via POST /complete. */
export function canSubmitLockedAttempt(session: AttemptSessionDto): boolean {
  return (
    session.status === 'IN_PROGRESS' && (session.locked || session.serverRemainingSeconds <= 0)
  );
}

export function startL1Request(trackCode: TrackCode) {
  return { trackCode, levelNumber: L1_LEVEL_NUMBER };
}

export function selectedIdsFromDraft(savedDraft: unknown): string[] {
  if (
    savedDraft &&
    typeof savedDraft === 'object' &&
    'kind' in savedDraft &&
    (savedDraft as { kind: unknown }).kind === 'MCQ' &&
    'selectedOptionIds' in savedDraft &&
    Array.isArray((savedDraft as { selectedOptionIds: unknown }).selectedOptionIds)
  ) {
    return (savedDraft as { selectedOptionIds: string[] }).selectedOptionIds.filter(
      (id): id is string => typeof id === 'string',
    );
  }
  return [];
}

export function buildMcqDraftPayload(
  attemptId: string,
  itemId: string,
  selectedOptionIds: string[],
  clientSequence: number,
): SaveDraftRequest {
  return {
    attemptId,
    itemId,
    answer: { kind: 'MCQ', selectedOptionIds },
    clientSequence,
  };
}

export function nextClientSequence(current: number): number {
  return current + 1;
}

/** High enough after refresh that a new draft cannot be superseded by a pre-refresh sequence. */
export function initialClientSequence(now = Date.now()): number {
  return now;
}

export function timerPropsFromSession(session: AttemptSessionDto): {
  duration: number;
  startedAt: string;
  serverNow: string;
} {
  const expiresAtMs = new Date(session.expiresAt).getTime();
  const startedAtMs = new Date(session.startedAt).getTime();
  const duration = Math.max(0, Math.floor((expiresAtMs - startedAtMs) / 1000));
  const serverNow = new Date(expiresAtMs - session.serverRemainingSeconds * 1000).toISOString();
  return { duration, startedAt: session.startedAt, serverNow };
}

export function isSessionLocked(session: AttemptSessionDto): boolean {
  return session.locked || session.serverRemainingSeconds <= 0 || session.status !== 'IN_PROGRESS';
}

export function isMcqSingle(item: DeliverableItemDto): boolean {
  return item.itemType === 'MCQ_SINGLE';
}

export function playerErrorFromUnknown(error: unknown): PlayerError {
  if (error instanceof SmartNetworkError) {
    return {
      kind: 'network',
      message: 'Connection dropped. Your last saved answer is kept on the server.',
    };
  }
  if (isSmartApiError(error)) {
    if (error.statusCode === 429) {
      return {
        kind: 'rate_limit',
        message: 'Too many answer saves. Wait before trying again.',
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    if (error.code === 'level_locked' || error.message.toLowerCase().includes('level locked')) {
      return { kind: 'level_locked', message: error.message };
    }
    if (error.statusCode === 404) {
      return { kind: 'not_found', message: error.message };
    }
    if (error.statusCode === 403) {
      return { kind: 'forbidden', message: error.message };
    }
    return { kind: 'unknown', message: error.message };
  }
  return {
    kind: 'unknown',
    message: error instanceof Error ? error.message : 'Something went wrong.',
  };
}
