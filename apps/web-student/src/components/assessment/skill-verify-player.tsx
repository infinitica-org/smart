'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@smart/ui';
import type {
  AssessmentResult,
  GradeSdeSkillFormResponse,
  SkillVerifyPrepareDto,
  SkillVerifySessionDto,
} from '@smart/contracts';
import { api } from '@/lib/api';
import {
  SKILL_VERIFICATION_PROFILE_UNLOCK_MESSAGE,
  formatRetryAt,
  formatSkillVerifyKioskTitle,
} from '@/lib/skill-declarations';
import {
  areAllSkillVerifyItemsAnswered,
  skillVerifyErrorFromUnknown,
  skillVerifyIncompleteError,
  type SkillVerifyError,
} from '@/lib/skill-verify-errors';
import { releaseProctoringSession } from '@/lib/proctoring/fullscreen';
import { ProctoringShell } from '@/components/proctoring/proctoring-shell';
import { SkillVerifyExam } from './skill-verify-exam';
import { SkillVerifyLoading } from './skill-verify-loading';
import { SkillVerifyPendingStep } from './skill-verify-pending-step';
import { SkillVerifyReport } from './skill-verify-report';

export function SkillVerifyPlayer({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<SkillVerifyPrepareDto | null>(null);
  const [session, setSession] = useState<SkillVerifySessionDto | null>(null);
  const [error, setError] = useState<SkillVerifyError | null>(null);
  const [generating, setGenerating] = useState(false);
  const [kioskTitle, setKioskTitle] = useState('Skill verification');
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<number, { selectedKey?: string; text?: string }>>(
    {},
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [report, setReport] = useState<GradeSdeSkillFormResponse | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [pendingSession, setPendingSession] = useState<SkillVerifySessionDto | null>(null);
  const [pendingGrade, setPendingGrade] = useState<GradeSdeSkillFormResponse | null>(null);
  const [terminationCooldown, setTerminationCooldown] = useState<string | null>(null);
  const [postAssessment, setPostAssessment] = useState<'summary' | 'pending' | null>(null);
  const [catalogSkillCode, setCatalogSkillCode] = useState<string | null>(null);
  const [targetedTransitionNote, setTargetedTransitionNote] = useState<string | null>(null);
  const generateStarted = useRef(false);

  useEffect(() => {
    if (postAssessment) {
      void releaseProctoringSession();
    }
  }, [postAssessment]);

  const mapStartError = useCallback((err: unknown, context: 'prepare' | 'generate') => {
    const mapped = skillVerifyErrorFromUnknown(err, context);
    return mapped;
  }, []);

  useEffect(() => {
    if (
      session &&
      error?.kind === 'incomplete' &&
      areAllSkillVerifyItemsAnswered(session, answers)
    ) {
      setError(null);
    }
  }, [session, answers, error]);

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
          setKioskTitle(formatSkillVerifyKioskTitle(claim.skillCode, 'DIAGNOSTIC'));
        }
        setPrepared(next);
      } catch (err) {
        if (!cancelled) {
          setError(mapStartError(err, 'prepare'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claimId, mapStartError]);

  const generateForm = useCallback(async () => {
    if (!prepared || generateStarted.current) return;
    generateStarted.current = true;
    setGenerating(true);
    try {
      const started = await api.assessment.startSkillVerify(claimId, {
        sessionId: prepared.sessionId,
      });
      setSession(started);
      setCatalogSkillCode(started.skillCode);
      setKioskTitle(formatSkillVerifyKioskTitle(started.skillCode, started.stage ?? 'DIAGNOSTIC'));
      const next: Record<number, { selectedKey?: string; text?: string }> = {};
      for (const row of started.answers) {
        next[row.index] = { selectedKey: row.selectedKey, text: row.text };
      }
      setAnswers(next);
      setCurrentIndex(0);
    } catch (err) {
      generateStarted.current = false;
      setError(mapStartError(err, 'generate'));
    } finally {
      setGenerating(false);
    }
  }, [claimId, mapStartError, prepared]);

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
      const res = await api.assessment.completeSkillVerify(sessionId, {
        responses: responsesRef.current,
        technicalFailure: false,
        integrityTerminated: true,
      });
      const cooldownIso = res?.claim?.lockedUntil ?? new Date(Date.now() + 86400000).toISOString();
      await releaseProctoringSession();
      setTerminationCooldown(cooldownIso);
      return res;
    } catch {
      await releaseProctoringSession();
      setTerminationCooldown(new Date(Date.now() + 86400000).toISOString());
    }
  }, [sessionId]);

  const save = () => {
    if (!session) return;
    startTransition(() => {
      void (async () => {
        try {
          const next = await api.assessment.saveSkillVerify(session.sessionId, { responses });
          setSession(next);
        } catch (err) {
          setError(skillVerifyErrorFromUnknown(err, 'save'));
        }
      })();
    });
  };

  const complete = () => {
    if (!session) return;
    if (!areAllSkillVerifyItemsAnswered(session, answers)) {
      setError(skillVerifyIncompleteError());
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const settled = await api.assessment.completeSkillVerify(session.sessionId, {
            responses,
            technicalFailure: false,
            integrityTerminated: false,
          });
          if (settled.claim?.status === 'LOCKED' || settled.claim?.lockedUntil) {
            await releaseProctoringSession();
            setTerminationCooldown(
              settled.claim.lockedUntil ?? new Date(Date.now() + 86400000).toISOString(),
            );
            return;
          }
          if (
            settled.pendingVerification &&
            settled.session &&
            settled.grade &&
            settled.assessmentResult
          ) {
            setPendingSession(settled.session);
            setPendingGrade(settled.grade);
            setAssessmentResult(settled.assessmentResult);
            setSession(null);
            setPostAssessment('pending');
            return;
          }
          if (settled.sessionContinues && settled.session) {
            const pending = settled.session.pendingCompetencies ?? [];
            setTargetedTransitionNote(
              pending.length > 0
                ? `A few targeted questions on: ${pending.slice(0, 3).join(', ')}${pending.length > 3 ? '…' : ''}.`
                : 'A short targeted follow-up based on your diagnostic.',
            );
            setSession(settled.session);
            setAnswers({});
            setCurrentIndex(0);
            setReport(null);
            setKioskTitle(
              formatSkillVerifyKioskTitle(
                settled.session.skillCode,
                settled.session.stage ?? 'TARGETED',
              ),
            );
            return;
          }
          if (settled.grade && !settled.technicalFailure) {
            setReport(settled.grade);
            setAssessmentResult(settled.assessmentResult ?? null);
            setSession(null);
            setPostAssessment('summary');
            return;
          }
          router.push('/skills');
        } catch (err) {
          setError(skillVerifyErrorFromUnknown(err, 'submit'));
        }
      })();
    });
  };

  const profileGate = error?.kind === 'profile_incomplete';

  if (terminationCooldown) {
    const formatted = formatRetryAt(terminationCooldown);
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert tone="danger" title="Assessment Terminated">
          <p className="mt-1">
            This verification attempt was terminated. A cooldown period is active.
          </p>
          {formatted ? (
            <p className="mt-2 text-xs font-semibold">
              You can re-attempt this verification after {formatted}.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/skills')}
            className="mt-4 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-background"
          >
            Back to Skills
          </button>
        </Alert>
      </div>
    );
  }

  if (error && !prepared) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Alert tone="danger" title={error.title}>
          {profileGate ? SKILL_VERIFICATION_PROFILE_UNLOCK_MESSAGE : error.message}
          {!profileGate && error.retryAfterSeconds
            ? ` Try again in ${String(error.retryAfterSeconds)} seconds.`
            : null}
        </Alert>
        {profileGate ? (
          <Link
            href="/profile"
            className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Complete your profile
          </Link>
        ) : null}
      </div>
    );
  }

  if (!prepared) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Checking eligibility…
      </p>
    );
  }

  const backToSkills = () => router.push('/assessment');

  if (postAssessment === 'summary' && report) {
    return (
      <SkillVerifyReport
        grade={report}
        assessmentResult={assessmentResult}
        catalogSkillCode={catalogSkillCode ?? undefined}
        onDone={backToSkills}
      />
    );
  }

  if (postAssessment === 'pending' && pendingSession && pendingGrade && assessmentResult) {
    return (
      <SkillVerifyPendingStep
        session={pendingSession}
        sessionId={pendingSession.sessionId}
        grade={pendingGrade}
        assessmentResult={assessmentResult}
        catalogSkillCode={catalogSkillCode ?? undefined}
        onDone={backToSkills}
      />
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
        <SkillVerifyLoading
          generating={generating}
          error={error}
          kioskTitle={kioskTitle}
          evidenceContext={prepared.evidenceContext}
        />
      ) : session ? (
        <SkillVerifyExam
          session={session}
          currentIndex={currentIndex}
          answers={answers}
          pending={isPending}
          error={error}
          kioskTitle={kioskTitle}
          stageNotice={targetedTransitionNote}
          onDismissStageNotice={() => setTargetedTransitionNote(null)}
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
          onExit={() => router.push('/assessment')}
          onSubmit={complete}
          onRunCode={(item, source) =>
            api.evaluation.runSkillFormCode({
              prompt: item.prompt,
              constraints: item.constraints,
              source,
              examples: item.examples ?? [],
            })
          }
        />
      ) : null}
    </ProctoringShell>
  );
}
