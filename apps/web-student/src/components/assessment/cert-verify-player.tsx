'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@smart/ui';
import type {
  CertAgendaPublicItem,
  CertVerifyPrepareDto,
  CertVerifySessionDto,
  GradeCertAgendaResponse,
  SkillVerifySessionDto,
} from '@smart/contracts';
import { api } from '@/lib/api';
import { formatRetryAt } from '@/lib/skill-declarations';
import {
  areAllSkillVerifyItemsAnswered,
  skillVerifyErrorFromUnknown,
  skillVerifyIncompleteError,
  type SkillVerifyError,
} from '@/lib/skill-verify-errors';
import { ProctoringShell } from '@/components/proctoring/proctoring-shell';
import { SkillVerifyExam } from './skill-verify-exam';
import { SkillVerifyLoading } from './skill-verify-loading';

function certSessionToSkillShape(session: CertVerifySessionDto): SkillVerifySessionDto {
  return {
    sessionId: session.sessionId,
    claimId: session.certificateId,
    skillCode: 'CERTIFICATION',
    proficiency: 'INTERMEDIATE',
    timeMinutes: session.timeMinutes,
    passMarkPercent: session.passMarkPercent,
    expiresAt: session.expiresAt,
    serverRemainingSeconds: session.serverRemainingSeconds,
    items: session.items.map((item: CertAgendaPublicItem) => ({
      index: item.index,
      format: 'MCQ' as const,
      prompt: item.stem,
      options: {
        A: item.options.find((row) => row.label === 'A')?.text ?? '',
        B: item.options.find((row) => row.label === 'B')?.text ?? '',
        C: item.options.find((row) => row.label === 'C')?.text ?? '',
        D: item.options.find((row) => row.label === 'D')?.text ?? '',
      },
      title: `Question ${String(item.index)}`,
    })),
    answers: session.answers,
  };
}

export function CertVerifyPlayer({
  certificateId,
  title,
}: {
  certificateId: string;
  title: string;
}) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<CertVerifyPrepareDto | null>(null);
  const [session, setSession] = useState<CertVerifySessionDto | null>(null);
  const [error, setError] = useState<SkillVerifyError | null>(null);
  const [generating, setGenerating] = useState(false);
  const [kioskTitle, setKioskTitle] = useState(title);
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<number, { selectedKey?: string; text?: string }>>(
    {},
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [report, setReport] = useState<GradeCertAgendaResponse | null>(null);
  const [terminationCooldown, setTerminationCooldown] = useState<string | null>(null);
  const generateStarted = useRef(false);

  useEffect(() => {
    if (
      session &&
      error?.kind === 'incomplete' &&
      areAllSkillVerifyItemsAnswered(certSessionToSkillShape(session), answers)
    ) {
      setError(null);
    }
  }, [session, answers, error]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await api.assessment.prepareCertVerify(certificateId);
        if (!cancelled) setPrepared(next);
      } catch (err) {
        if (!cancelled) {
          setError(skillVerifyErrorFromUnknown(err, 'prepare'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  const generateForm = useCallback(async () => {
    if (!prepared || generateStarted.current) return;
    generateStarted.current = true;
    setGenerating(true);
    try {
      const started = await api.assessment.startCertVerify(certificateId, {
        sessionId: prepared.sessionId,
      });
      setSession(started);
      setKioskTitle(`${title} — certification check`);
      const next: Record<number, { selectedKey?: string; text?: string }> = {};
      for (const row of started.answers) {
        next[row.index] = { selectedKey: row.selectedKey, text: row.text };
      }
      setAnswers(next);
      setCurrentIndex(0);
    } catch (err) {
      generateStarted.current = false;
      setError(skillVerifyErrorFromUnknown(err, 'generate'));
    } finally {
      setGenerating(false);
    }
  }, [certificateId, prepared, title]);

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
  const onLockTerminate = useCallback(async () => {
    if (!sessionId) return Promise.resolve();
    try {
      const res = await api.assessment.completeCertVerify(sessionId, {
        responses: responsesRef.current,
        technicalFailure: false,
        integrityTerminated: true,
      });
      const cooldownIso =
        res?.certificate?.lockedUntil ?? new Date(Date.now() + 86400000).toISOString();
      setTerminationCooldown(cooldownIso);
      return res;
    } catch {
      setTerminationCooldown(new Date(Date.now() + 86400000).toISOString());
    }
  }, [sessionId]);

  const save = () => {
    if (!session) return;
    startTransition(() => {
      void (async () => {
        try {
          const next = await api.assessment.saveCertVerify(session.sessionId, { responses });
          setSession(next);
        } catch (err) {
          setError(skillVerifyErrorFromUnknown(err, 'save'));
        }
      })();
    });
  };

  const complete = () => {
    if (!session) return;
    if (!areAllSkillVerifyItemsAnswered(certSessionToSkillShape(session), answers)) {
      setError(skillVerifyIncompleteError());
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const settled = await api.assessment.completeCertVerify(session.sessionId, {
            responses,
            technicalFailure: false,
            integrityTerminated: false,
          });
          if (settled.certificate.status === 'REJECTED' || settled.certificate.lockedUntil) {
            setTerminationCooldown(
              settled.certificate.lockedUntil ?? new Date(Date.now() + 86400000).toISOString(),
            );
            return;
          }
          if (settled.grade && !settled.technicalFailure) {
            setReport(settled.grade);
            return;
          }
          router.push('/certificates');
        } catch (err) {
          setError(skillVerifyErrorFromUnknown(err, 'submit'));
        }
      })();
    });
  };

  const skillSession = session ? certSessionToSkillShape(session) : null;

  if (terminationCooldown) {
    const formatted = formatRetryAt(terminationCooldown);
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert tone="danger" title="Assessment Terminated">
          <p className="mt-1">
            This certificate assessment was terminated or did not pass. A cooldown may apply.
          </p>
          {formatted ? (
            <p className="mt-2 text-xs font-semibold">You can re-attempt after {formatted}.</p>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/certificates')}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
          >
            Back to Certificates
          </button>
        </Alert>
      </div>
    );
  }

  if (error && !prepared) {
    return (
      <Alert tone="danger" title={error.title}>
        {error.message}
        {error.retryAfterSeconds
          ? ` Try again in ${String(error.retryAfterSeconds)} seconds.`
          : null}
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
      {!session || !skillSession ? (
        <SkillVerifyLoading generating={generating} error={error} kioskTitle={kioskTitle} />
      ) : report ? (
        <div className="mx-auto max-w-lg space-y-4 p-6 text-white">
          <h2 className="text-xl font-semibold">
            {report.passed ? 'Certificate verified' : 'Assessment complete'}
          </h2>
          <p className="text-sm text-white/70">
            Score: {report.scorePercent.toFixed(0)}% ({report.marksEarned}/{report.marksTotal})
          </p>
          <button
            type="button"
            onClick={() => router.push('/certificates')}
            className="rounded-lg bg-[#00fad0] px-4 py-2 text-sm font-semibold text-black"
          >
            Back to Certificates
          </button>
        </div>
      ) : (
        <SkillVerifyExam
          session={skillSession}
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
          onExit={() => router.push('/certificates')}
          onSubmit={complete}
        />
      )}
    </ProctoringShell>
  );
}
