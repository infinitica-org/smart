'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@smart/ui';
import type {
  GradeSdeSkillFormResponse,
  SkillVerifyPrepareDto,
  SkillVerifySessionDto,
} from '@smart/contracts';
import { api } from '@/lib/api';
import { formatSkillVerifyKioskTitle } from '@/lib/skill-declarations';
import { ProctoringShell } from '@/components/proctoring/proctoring-shell';
import { SkillVerifyExam } from './skill-verify-exam';
import { SkillVerifyLoading } from './skill-verify-loading';
import { SkillVerifyReport } from './skill-verify-report';

export function SkillVerifyPlayer({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<SkillVerifyPrepareDto | null>(null);
  const [session, setSession] = useState<SkillVerifySessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [kioskTitle, setKioskTitle] = useState('Skill verification');
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<number, { selectedKey?: string; text?: string }>>(
    {},
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [report, setReport] = useState<GradeSdeSkillFormResponse | null>(null);
  const generateStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [next, claims] = await Promise.all([
          api.assessment.prepareSkillVerify(claimId),
          api.assessment.listSkillClaims().catch(() => []),
        ]);
        if (cancelled) return;
        const claim = claims.find((row) => row.claimId === claimId);
        if (claim) {
          setKioskTitle(formatSkillVerifyKioskTitle(claim.skillCode, claim.proficiency));
        }
        setPrepared(next);
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
      setKioskTitle(formatSkillVerifyKioskTitle(started.skillCode, started.proficiency));
      const next: Record<number, { selectedKey?: string; text?: string }> = {};
      for (const row of started.answers) {
        next[row.index] = { selectedKey: row.selectedKey, text: row.text };
      }
      setAnswers(next);
      setCurrentIndex(0);
    } catch (err) {
      generateStarted.current = false;
      setError(err instanceof Error ? err.message : 'Could not generate the form.');
    } finally {
      setGenerating(false);
    }
  }, [claimId, prepared]);

  const generateFormRef = useRef(generateForm);
  generateFormRef.current = generateForm;

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
      technicalFailure: false,
      integrityTerminated: true,
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
          const settled = await api.assessment.completeSkillVerify(session.sessionId, {
            responses,
            technicalFailure: false,
            integrityTerminated: false,
          });
          if (settled.grade && !settled.technicalFailure) {
            setReport(settled.grade);
            return;
          }
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
      cameraEnabled
      faceLiveCheck
      kioskTitle={kioskTitle}
      onReady={() => {
        void generateFormRef.current();
      }}
    >
      {!session ? (
        <SkillVerifyLoading generating={generating} error={error} kioskTitle={kioskTitle} />
      ) : report ? (
        <SkillVerifyReport grade={report} onDone={() => router.push('/assessments')} />
      ) : (
        <SkillVerifyExam
          session={session}
          currentIndex={currentIndex}
          answers={answers}
          pending={isPending}
          error={error}
          kioskTitle={kioskTitle}
          onSelectKey={(itemIndex, key) =>
            setAnswers((prev) => ({
              ...prev,
              [itemIndex]: { ...prev[itemIndex], selectedKey: key, text: undefined },
            }))
          }
          onChangeText={(itemIndex, text) =>
            setAnswers((prev) => ({
              ...prev,
              [itemIndex]: { ...prev[itemIndex], text, selectedKey: undefined },
            }))
          }
          onGoTo={(index) => {
            save();
            setCurrentIndex(index);
          }}
          onClear={(itemIndex) =>
            setAnswers((prev) => {
              const next = { ...prev };
              delete next[itemIndex];
              return next;
            })
          }
          onExit={() => router.push('/assessments')}
          onSubmit={complete}
        />
      )}
    </ProctoringShell>
  );
}
