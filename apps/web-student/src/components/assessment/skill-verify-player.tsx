'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@smart/ui';
import type { SkillVerifyPrepareDto, SkillVerifySessionDto } from '@smart/contracts';
import { api } from '@/lib/api';
import { ProctoringShell } from '@/components/proctoring/proctoring-shell';

export function SkillVerifyPlayer({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<SkillVerifyPrepareDto | null>(null);
  const [session, setSession] = useState<SkillVerifySessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<number, { selectedKey?: string; text?: string }>>(
    {},
  );
  const generateStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await api.assessment.prepareSkillVerify(claimId);
        if (!cancelled) setPrepared(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not start verification.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  const generateForm = useCallback(async () => {
    if (!prepared || generateStarted.current) return;
    generateStarted.current = true;
    setGenerating(true);
    try {
      const started = await api.assessment.startSkillVerify(claimId, {
        sessionId: prepared.sessionId,
      });
      setSession(started);
      const next: Record<number, { selectedKey?: string; text?: string }> = {};
      for (const row of started.answers) {
        next[row.index] = { selectedKey: row.selectedKey, text: row.text };
      }
      setAnswers(next);
    } catch (err) {
      generateStarted.current = false;
      setError(err instanceof Error ? err.message : 'Could not generate the form.');
    } finally {
      setGenerating(false);
    }
  }, [claimId, prepared]);

  const generateFormRef = useRef(generateForm);
  generateFormRef.current = generateForm;

  const remainingLabel = useMemo(() => {
    if (!session) return '';
    const minutes = Math.floor(session.serverRemainingSeconds / 60);
    const seconds = session.serverRemainingSeconds % 60;
    return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
  }, [session]);

  const responses = useMemo(
    () =>
      Object.entries(answers).map(([index, value]) => ({
        index: Number(index),
        selectedKey: value.selectedKey,
        text: value.text,
      })),
    [answers],
  );
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  const sessionId = session?.sessionId ?? prepared?.sessionId;
  const onLockTerminate = useCallback(() => {
    if (!sessionId) return Promise.resolve();
    return api.assessment.completeSkillVerify(sessionId, {
      responses: responsesRef.current,
      technicalFailure: true,
    });
  }, [sessionId]);

  const save = () => {
    if (!session) return;
    startTransition(() => {
      void (async () => {
        try {
          const next = await api.assessment.saveSkillVerify(session.sessionId, { responses });
          setSession(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Save failed.');
        }
      })();
    });
  };

  const complete = () => {
    if (!session) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await api.assessment.completeSkillVerify(session.sessionId, {
            responses,
            technicalFailure: false,
          });
          router.push('/assessments');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not complete verification.');
        }
      })();
    });
  };

  if (error && !prepared) {
    return (
      <Alert tone="danger" title="Could not start">
        {error}
      </Alert>
    );
  }

  if (!prepared) {
    return (
      <p className="text-sm text-white/50" aria-live="polite">
        Checking eligibility…
      </p>
    );
  }

  return (
    <ProctoringShell
      attemptId={prepared.sessionId}
      onLockTerminate={onLockTerminate}
      onReady={() => {
        void generateFormRef.current();
      }}
    >
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        {error ? (
          <Alert tone="danger" title="Error">
            {error}
          </Alert>
        ) : null}
        {!session ? (
          <p className="text-sm text-white/50" aria-live="polite">
            {generating ? 'Generating form…' : 'Waiting for proctoring checks…'}
          </p>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-semibold text-white">Skill verification</h1>
              <p className="mt-1 text-sm text-white/40">
                Server clock {remainingLabel} remaining. Pass bar {String(session.passMarkPercent)}
                %. Proctored. Not a certification attempt.
              </p>
            </div>
            <ol className="flex flex-col gap-6">
              {session.items.map((item) => (
                <li
                  key={item.index}
                  className="rounded-2xl border border-white/10 bg-[#141414] p-4"
                >
                  <p className="text-xs font-medium text-white/40">
                    {item.format} · {item.index}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white">{item.prompt}</p>
                  {item.options ? (
                    <fieldset className="mt-3 flex flex-col gap-2">
                      {(Object.keys(item.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => (
                        <label key={key} className="flex items-start gap-2 text-sm text-white/80">
                          <input
                            type="radio"
                            name={`item-${String(item.index)}`}
                            checked={answers[item.index]?.selectedKey === key}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [item.index]: { ...prev[item.index], selectedKey: key },
                              }))
                            }
                          />
                          <span>
                            {key}. {item.options?.[key]}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <textarea
                      className="mt-3 min-h-32 w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-3 text-sm text-white"
                      value={answers[item.index]?.text ?? ''}
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [item.index]: { ...prev[item.index], text: event.target.value },
                        }))
                      }
                    />
                  )}
                </li>
              ))}
            </ol>
            <div className="flex gap-3">
              <Button type="button" disabled={isPending} onClick={save}>
                Save
              </Button>
              <Button type="button" disabled={isPending} onClick={complete}>
                Submit
              </Button>
            </div>
          </>
        )}
      </section>
    </ProctoringShell>
  );
}
