'use client';

import { useEffect, useState, useTransition } from 'react';
import type {
  AssessmentResult,
  GradeSdeSkillFormResponse,
  SkillVerifyInterviewDto,
  SkillVerifySessionDto,
} from '@smart/contracts';
import { Alert, Button } from '@smart/ui';
import { api } from '@/lib/api';
import { SkillVerifyReport } from './skill-verify-report';

export function SkillVerifyPendingStep({
  session,
  sessionId,
  grade,
  assessmentResult,
  onDone,
}: {
  session: SkillVerifySessionDto;
  sessionId: string;
  grade: GradeSdeSkillFormResponse;
  assessmentResult: AssessmentResult;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [interview, setInterview] = useState<SkillVerifyInterviewDto | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finalReport, setFinalReport] = useState<{
    grade: GradeSdeSkillFormResponse;
    assessmentResult: AssessmentResult | null;
  } | null>(null);

  const step = session.verificationStep ?? assessmentResult.recommendedNextStep;

  useEffect(() => {
    if (step !== 'INTERVIEW' || interview) return;
    void (async () => {
      try {
        const next = await api.assessment.startSkillVerifyInterview(sessionId);
        setInterview(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load interview.');
      }
    })();
  }, [interview, sessionId, step]);

  const submitInterview = () => {
    if (!interview) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const settled = await api.assessment.completeSkillVerifyInterview(sessionId, {
            items: interview.questions.map((question) => ({
              index: question.index,
              question: question.text,
              answer: answers[question.index] ?? '',
            })),
          });
          if (settled.grade) {
            setFinalReport({
              grade: settled.grade,
              assessmentResult: settled.assessmentResult ?? assessmentResult,
            });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Interview could not be submitted.');
        }
      })();
    });
  };

  const checkEvidence = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const settled = await api.assessment.finalizeSkillVerify(sessionId);
          if (settled.pendingVerification) {
            setError(
              'Link project or work evidence to this skill on your profile, then try again.',
            );
            return;
          }
          if (settled.grade) {
            setFinalReport({
              grade: settled.grade,
              assessmentResult: settled.assessmentResult ?? assessmentResult,
            });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Verification could not be finalized.');
        }
      })();
    });
  };

  if (finalReport) {
    return (
      <SkillVerifyReport
        grade={finalReport.grade}
        assessmentResult={finalReport.assessmentResult}
        onDone={onDone}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">Additional verification</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Assessment supports {assessmentResult.highestAssessmentSupportedProficiency}. One more
          step is required before your claim can be verified.
        </p>
      </header>

      {error ? (
        <Alert tone="danger" title="Verification step">
          {error}
        </Alert>
      ) : null}

      {step === 'EVIDENCE_VERIFICATION' ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
          <p className="text-sm">
            Link a project or work experience that demonstrates this skill on your profile, then
            confirm verification.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open('/profile', '_self')}
            >
              Open profile
            </Button>
            <Button type="button" variant="primary" disabled={pending} onClick={checkEvidence}>
              Check verification
            </Button>
          </div>
        </section>
      ) : null}

      {step === 'INTERVIEW' && interview ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Answer briefly from your own experience. These questions target competencies that still
            need confirmation.
          </p>
          <div className="flex flex-col gap-4">
            {interview.questions.map((question) => (
              <label key={question.index} className="flex flex-col gap-2 text-sm">
                <span className="font-medium">
                  {String(question.index)}. {question.text}
                </span>
                <textarea
                  className="min-h-24 rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
                  value={answers[question.index] ?? ''}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [question.index]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <Button
            type="button"
            className="mt-4"
            variant="primary"
            disabled={pending}
            onClick={submitInterview}
          >
            Submit defense interview
          </Button>
        </section>
      ) : null}

      {step === 'INTERVIEW' && !interview && !error ? (
        <p className="text-sm text-[var(--text-muted)]">Loading interview questions…</p>
      ) : null}
    </div>
  );
}
