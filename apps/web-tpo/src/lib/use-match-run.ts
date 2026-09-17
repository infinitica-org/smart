import { useCallback, useEffect, useRef, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { MatchRunDto, MatchRequest } from '@smart/contracts';
import { matchingApi } from './api';

const POLL_INTERVAL_MS = 2000;

function isTerminal(status: MatchRunDto['status']): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED';
}

/**
 * Triggers an async, batch-scoped match run (S6-VV-76) and polls its status every
 * `POLL_INTERVAL_MS` until it reaches a terminal state. No `@smart/ui` `useQuery` here since
 * web-tpo doesn't wrap its app in a `SmartApiProvider`/`QueryClientProvider` today.
 */
export function useMatchRun(pollIntervalMs: number = POLL_INTERVAL_MS) {
  const [run, setRun] = useState<MatchRunDto | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const trigger = useCallback(
    async (request: MatchRequest) => {
      stopPolling();
      setError(null);
      setRun(null);
      setTriggering(true);
      try {
        const { runId, status } = await matchingApi.createRun(request);
        setRun({
          runId,
          jdId: request.jdId,
          status,
          eligiblePoolCount: null,
          suggestedCount: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
          shortlist: null,
        });

        intervalRef.current = setInterval(() => {
          void matchingApi
            .getRun(runId)
            .then((next) => {
              setRun(next);
              if (isTerminal(next.status)) stopPolling();
            })
            .catch((caught) => {
              stopPolling();
              setError(
                isSmartApiError(caught) || caught instanceof Error
                  ? caught.message
                  : 'Could not check match run status.',
              );
            });
        }, pollIntervalMs);
      } catch (caught) {
        setError(
          isSmartApiError(caught) || caught instanceof Error
            ? caught.message
            : 'Could not start matching.',
        );
      } finally {
        setTriggering(false);
      }
    },
    [stopPolling, pollIntervalMs],
  );

  const reset = useCallback(() => {
    stopPolling();
    setRun(null);
    setError(null);
  }, [stopPolling]);

  return {
    run,
    triggering,
    inProgress: Boolean(run && !isTerminal(run.status)),
    error,
    trigger,
    reset,
  };
}
