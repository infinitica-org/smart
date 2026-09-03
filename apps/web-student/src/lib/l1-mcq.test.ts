import { describe, expect, it } from 'vitest';
import { SmartApiError, SmartNetworkError } from '@smart/api-client';
import type { AttemptSessionDto, DeliverableItemDto } from '@smart/contracts';
import {
  buildMcqDraftPayload,
  canSubmitLockedAttempt,
  clearLastL1AttemptId,
  isInProgressSession,
  isMcqSingle,
  isMockApiEnabled,
  isSessionLocked,
  L1_LAST_ATTEMPT_STORAGE_KEY,
  L1_LEVEL_NUMBER,
  initialClientSequence,
  nextClientSequence,
  playerErrorFromUnknown,
  readLastL1AttemptId,
  resolveL1TrackCode,
  selectedIdsFromDraft,
  startL1Request,
  timerPropsFromSession,
  writeLastL1AttemptId,
} from './l1-mcq';

const ITEM: DeliverableItemDto = {
  itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  competencyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  domainCode: 'A',
  itemType: 'MCQ_SINGLE',
  difficulty: 'EASY',
  promptText: 'Which hook runs after render?',
  options: [
    { optionId: 'opt-a', label: 'useEffect' },
    { optionId: 'opt-b', label: 'useMemo' },
  ],
  itemWeight: 1,
};

function session(overrides: Partial<AttemptSessionDto> = {}): AttemptSessionDto {
  return {
    attemptId: '55555555-5555-4555-8555-555555555555',
    studentId: '11111111-1111-4111-8111-111111111111',
    trackCode: 'MBA_FINANCE',
    levelNumber: 1,
    levelFormat: 'MCQ',
    status: 'IN_PROGRESS',
    formId: 'A',
    startedAt: '2026-09-02T10:00:00.000Z',
    expiresAt: '2026-09-02T11:00:00.000Z',
    serverRemainingSeconds: 1800,
    totalItems: 2,
    answeredItems: 0,
    currentItemIndex: 0,
    integrityFlag: 'CLEAN',
    locked: false,
    ...overrides,
  };
}

describe('l1-mcq helpers', () => {
  it('keeps the mock API opt-in rather than default', () => {
    expect(isMockApiEnabled(undefined)).toBe(false);
    expect(isMockApiEnabled('false')).toBe(false);
    expect(isMockApiEnabled('true')).toBe(true);
  });

  it('starts L1 with an existing track code, never a skillCode', () => {
    expect(startL1Request('MBA_FINANCE')).toEqual({
      trackCode: 'MBA_FINANCE',
      levelNumber: L1_LEVEL_NUMBER,
    });
    expect(resolveL1TrackCode({ primaryTrack: 'TECH_FULLSTACK' })).toBe('TECH_FULLSTACK');
    expect(resolveL1TrackCode({ primaryTrack: null })).toBeNull();
    expect(resolveL1TrackCode({ primaryTrack: 'not-a-track' })).toBeNull();
  });

  it('stores a last attempt id only in sessionStorage', () => {
    sessionStorage.clear();
    expect(readLastL1AttemptId()).toBeNull();
    writeLastL1AttemptId('55555555-5555-4555-8555-555555555555');
    expect(sessionStorage.getItem(L1_LAST_ATTEMPT_STORAGE_KEY)).toBe(
      '55555555-5555-4555-8555-555555555555',
    );
    expect(readLastL1AttemptId()).toBe('55555555-5555-4555-8555-555555555555');
    clearLastL1AttemptId();
    expect(readLastL1AttemptId()).toBeNull();
  });

  it('allows complete on an in-progress locked or expired session', () => {
    expect(isInProgressSession(session())).toBe(true);
    expect(canSubmitLockedAttempt(session())).toBe(false);
    expect(canSubmitLockedAttempt(session({ locked: true, serverRemainingSeconds: 0 }))).toBe(true);
    expect(canSubmitLockedAttempt(session({ status: 'EVALUATED', locked: true }))).toBe(false);
  });

  it('builds a monotonic MCQ draft payload without answer keys', () => {
    const first = buildMcqDraftPayload('att', ITEM.itemId, ['opt-a'], 1);
    const second = buildMcqDraftPayload('att', ITEM.itemId, ['opt-b'], nextClientSequence(1));
    expect(first.answer).toEqual({ kind: 'MCQ', selectedOptionIds: ['opt-a'] });
    expect(second.clientSequence).toBe(2);
    expect(initialClientSequence(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(nextClientSequence(initialClientSequence(1_700_000_000_000))).toBe(1_700_000_000_001);
    expect(JSON.stringify(first)).not.toContain('isCorrect');
    expect(JSON.stringify(first)).not.toContain('modelAnswer');
  });

  it('restores selectedOptionIds from savedDraft', () => {
    expect(selectedIdsFromDraft({ kind: 'MCQ', selectedOptionIds: ['opt-b'] })).toEqual(['opt-b']);
    expect(selectedIdsFromDraft({ kind: 'TEXT', text: 'nope' })).toEqual([]);
    expect(selectedIdsFromDraft(undefined)).toEqual([]);
  });

  it('derives the timer from server remaining seconds, not client-only clocks', () => {
    const props = timerPropsFromSession(session());
    expect(props.duration).toBe(3600);
    expect(props.startedAt).toBe('2026-09-02T10:00:00.000Z');
    expect(new Date(props.serverNow).getTime()).toBe(
      new Date('2026-09-02T11:00:00.000Z').getTime() - 1800 * 1000,
    );
  });

  it('locks when the server reports locked, expired, or a non-progress status', () => {
    expect(isSessionLocked(session())).toBe(false);
    expect(isSessionLocked(session({ locked: true }))).toBe(true);
    expect(isSessionLocked(session({ serverRemainingSeconds: 0 }))).toBe(true);
    expect(isSessionLocked(session({ status: 'SUBMITTED', locked: true }))).toBe(true);
  });

  it('treats MCQ_SINGLE as the player item type', () => {
    expect(isMcqSingle(ITEM)).toBe(true);
    expect(isMcqSingle({ ...ITEM, itemType: 'NUMERIC_ENTRY' })).toBe(false);
  });

  it('maps 403/404/429 and network failures', () => {
    expect(
      playerErrorFromUnknown(
        new SmartApiError({
          error: 'level_locked',
          message: 'Level 1 is locked.',
          statusCode: 403,
        }),
      ).kind,
    ).toBe('level_locked');
    expect(
      playerErrorFromUnknown(
        new SmartApiError({
          error: 'not_found',
          message: 'Item bank for form A is empty.',
          statusCode: 404,
        }),
      ).kind,
    ).toBe('not_found');
    expect(
      playerErrorFromUnknown(
        new SmartApiError({
          error: 'rate_limit_exceeded',
          message: 'Slow down.',
          statusCode: 429,
          retryAfterSeconds: 12,
        }),
      ),
    ).toEqual({
      kind: 'rate_limit',
      message: 'Too many answer saves. Wait before trying again.',
      retryAfterSeconds: 12,
    });
    expect(playerErrorFromUnknown(new SmartNetworkError('offline')).kind).toBe('network');
  });
});
