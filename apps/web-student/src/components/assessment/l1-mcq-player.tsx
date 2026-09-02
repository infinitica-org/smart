'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AssessmentHeader,
  AssessmentNavigation,
  AnswerOption,
  Button,
  ProgressIndicator,
  QuestionCard,
  Timer,
} from '@smart/ui';
import type {
  AttemptSessionDto,
  CompleteAttemptResponse,
  DeliverableItemDto,
  NextItemDto,
} from '@smart/contracts';
import { api } from '../../lib/api';
import {
  buildMcqDraftPayload,
  isMcqSingle,
  isSessionLocked,
  initialClientSequence,
  L1_AUTOSAVE_MS,
  nextClientSequence,
  playerErrorFromUnknown,
  selectedIdsFromDraft,
  timerPropsFromSession,
  type PlayerError,
} from '../../lib/l1-mcq';

export interface L1McqQuestionProps {
  item: DeliverableItemDto;
  selectedOptionIds: string[];
  disabled: boolean;
  onSelect: (optionId: string) => void;
}

export function L1McqQuestion({ item, selectedOptionIds, disabled, onSelect }: L1McqQuestionProps) {
  const options = item.options ?? [];
  return (
    <QuestionCard questionText={item.promptText}>
      {options.map((option) => (
        <AnswerOption
          key={option.optionId}
          label={option.label}
          selected={selectedOptionIds.includes(option.optionId)}
          disabled={disabled}
          onClick={() => onSelect(option.optionId)}
        />
      ))}
    </QuestionCard>
  );
}

export function L1McqPlayer({ attemptId }: { attemptId: string }) {
  const [session, setSession] = useState<AttemptSessionDto | null>(null);
  const [nextItem, setNextItem] = useState<NextItemDto | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [error, setError] = useState<PlayerError | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completeResult, setCompleteResult] = useState<CompleteAttemptResponse | null>(null);
  const [completing, setCompleting] = useState(false);
  const sequenceRef = useRef(initialClientSequence());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<string[]>([]);

  const locked = session ? isSessionLocked(session) : false;
  const item = nextItem?.item ?? null;
  const atEnd = nextItem !== null && nextItem.item === null;

  const clearSaveTimer = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const persistDraft = useCallback(
    async (itemId: string, optionIds: string[]) => {
      if (optionIds.length === 0) return;
      sequenceRef.current = nextClientSequence(sequenceRef.current);
      setSaving(true);
      try {
        await api.assessment.saveAnswer(
          buildMcqDraftPayload(attemptId, itemId, optionIds, sequenceRef.current),
        );
        setError(null);
      } catch (err) {
        setError(playerErrorFromUnknown(err));
      } finally {
        setSaving(false);
      }
    },
    [attemptId],
  );

  const load = useCallback(
    async (index?: number) => {
      setLoading(true);
      setError(null);
      try {
        const liveSession = await api.assessment.session(attemptId);
        setSession(liveSession);
        if (isSessionLocked(liveSession)) {
          setNextItem(null);
          return;
        }
        const itemPage = await api.assessment.nextItem(
          attemptId,
          index === undefined ? undefined : { index },
        );
        setNextItem(itemPage);
        const restored = selectedIdsFromDraft(itemPage.savedDraft);
        setSelectedOptionIds(restored);
        selectedRef.current = restored;
      } catch (err) {
        setError(playerErrorFromUnknown(err));
      } finally {
        setLoading(false);
      }
    },
    [attemptId],
  );

  useEffect(() => {
    void load();
    return () => clearSaveTimer();
  }, [load]);

  const scheduleSave = (itemId: string, optionIds: string[]) => {
    clearSaveTimer();
    saveTimerRef.current = setTimeout(() => {
      void persistDraft(itemId, optionIds);
    }, L1_AUTOSAVE_MS);
  };

  const onSelect = (optionId: string) => {
    if (!item || locked || completeResult) return;
    const nextIds = isMcqSingle(item) ? [optionId] : [optionId];
    setSelectedOptionIds(nextIds);
    selectedRef.current = nextIds;
    scheduleSave(item.itemId, nextIds);
  };

  const goTo = async (index: number) => {
    if (!item) {
      await load(index);
      return;
    }
    clearSaveTimer();
    if (selectedRef.current.length > 0 && !locked) {
      await persistDraft(item.itemId, selectedRef.current);
    }
    await load(index);
  };

  const onComplete = async () => {
    if (locked && session?.status === 'IN_PROGRESS' && session.serverRemainingSeconds > 0) return;
    setCompleting(true);
    setError(null);
    try {
      if (item && selectedRef.current.length > 0) {
        await persistDraft(item.itemId, selectedRef.current);
      }
      const result = await api.assessment.complete({ attemptId });
      setCompleteResult(result);
      const live = await api.assessment.session(attemptId).catch(() => null);
      if (live) setSession(live);
    } catch (err) {
      setError(playerErrorFromUnknown(err));
    } finally {
      setCompleting(false);
    }
  };

  const title = session
    ? `${session.trackCode.replaceAll('_', ' ')} · Level ${String(session.levelNumber)}`
    : 'L1 MCQ';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-16">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#141414]">
        <AssessmentHeader
          title={title}
          rightSlot={
            session ? (
              <Timer
                {...timerPropsFromSession(session)}
                onExpire={() => {
                  void load(nextItem?.index);
                }}
              />
            ) : null
          }
        />
        <div className="space-y-4 p-6">
          {loading ? (
            <p className="text-sm text-white/50" aria-live="polite">
              Loading assessment…
            </p>
          ) : null}

          {error ? (
            <Alert
              tone={error.kind === 'rate_limit' ? 'warning' : 'danger'}
              title={
                error.kind === 'level_locked'
                  ? 'Level locked'
                  : error.kind === 'not_found'
                    ? 'Question bank unavailable'
                    : error.kind === 'rate_limit'
                      ? 'Rate limited'
                      : error.kind === 'network'
                        ? 'Connection lost'
                        : 'Could not load assessment'
              }
            >
              {error.message}
              {error.retryAfterSeconds ? ` Retry after ${String(error.retryAfterSeconds)}s.` : null}
            </Alert>
          ) : null}

          {session && (locked || completeResult) ? (
            <Alert
              tone={completeResult ? 'success' : 'warning'}
              title={completeResult ? 'Attempt submitted' : 'Attempt locked'}
            >
              {completeResult
                ? `Status ${completeResult.status}. Results are not shown here — scoring is processed separately.`
                : 'The server clock has closed this attempt. Answers can no longer be changed.'}
            </Alert>
          ) : null}

          {item && nextItem && !loading ? (
            <>
              <ProgressIndicator current={nextItem.index + 1} total={nextItem.totalItems || 1} />
              {isMcqSingle(item) ? (
                <L1McqQuestion
                  item={item}
                  selectedOptionIds={selectedOptionIds}
                  disabled={locked || Boolean(completeResult)}
                  onSelect={onSelect}
                />
              ) : (
                <Alert tone="info" title="Unsupported item type">
                  This player only renders L1 MCQ items.
                </Alert>
              )}
              <p className="text-xs text-white/35" aria-live="polite">
                {saving ? 'Saving answer…' : 'Answers autosave. This is not the final submission.'}
              </p>
              <AssessmentNavigation
                canPrevious={nextItem.index > 0 && !locked}
                canNext={!locked}
                nextLabel={
                  nextItem.totalItems > 0 && nextItem.index + 1 >= nextItem.totalItems
                    ? 'Finish'
                    : 'Next'
                }
                onPrevious={() => void goTo(nextItem.index - 1)}
                onNext={() => void goTo(nextItem.index + 1)}
              />
            </>
          ) : null}

          {atEnd && !loading ? (
            <div className="space-y-4">
              <ProgressIndicator current={nextItem.totalItems} total={nextItem.totalItems} />
              <Alert tone="info" title="Ready to submit">
                The form is exhausted. Submitting finalizes the attempt. No score is invented here.
              </Alert>
              {completeResult ? null : (
                <Button
                  type="button"
                  variant="primary"
                  disabled={completing || (locked && session?.status !== 'IN_PROGRESS')}
                  onClick={() => void onComplete()}
                >
                  {completing ? 'Submitting…' : 'Submit attempt'}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
