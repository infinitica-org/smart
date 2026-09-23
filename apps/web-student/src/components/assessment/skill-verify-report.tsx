'use client';

import Link from 'next/link';
import type { GradeSdeSkillFormResponse } from '@smart/contracts';
import { Badge, Button, VerificationBadge } from '@smart/ui';
import { PROFICIENCY_LABELS, skillNameForCode } from '@/lib/skill-declarations';
import { type AssessmentResultView, targetedAssessmentSkipMessage } from '@/lib/competency-display';
import { CompetencyResultsGrid } from './competency-results-grid';
import { SkillEvidenceInferencePanel } from './skill-evidence-inference-panel';
import { SkillLevelExplanationPanel } from './skill-level-explanation-panel';

export function SkillVerifyReport({
  grade,
  assessmentResult,
  catalogSkillCode,
  onDone,
}: {
  grade?: GradeSdeSkillFormResponse | null;
  assessmentResult?: AssessmentResultView | null;
  catalogSkillCode?: string;
  onDone: () => void;
}) {
  const skillLabel = catalogSkillCode
    ? skillNameForCode(catalogSkillCode)
    : (grade?.skillCode ?? 'Skill verification');
  const demonstrated = assessmentResult?.highestAssessmentSupportedProficiency;
  const demonstratedLabel = demonstrated
    ? (PROFICIENCY_LABELS[demonstrated] ?? demonstrated)
    : 'Not demonstrated';
  const intelligenceResult = assessmentResult && assessmentResult.competencyResults.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 text-[var(--text-primary)]">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Assessment complete</h1>
        <p className="text-sm text-[var(--text-muted)]">{skillLabel}</p>
      </header>

      {intelligenceResult ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Assessment-supported proficiency</p>
          <p className="mt-1 text-2xl font-bold">{demonstratedLabel}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">
              Confidence: {assessmentResult.confidence.toLowerCase()}
            </span>
            {assessmentResult.verificationDecision ? (
              <VerificationBadge status={assessmentResult.verificationDecision} variant="outline" />
            ) : null}
            {typeof assessmentResult.claimConfidence === 'number' ? (
              <span className="text-xs text-[var(--text-muted)]">
                {Math.round(assessmentResult.claimConfidence * 100)}% claim confidence
              </span>
            ) : null}
          </div>
          {assessmentResult.requiresEvidenceVerification ? (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
              Real-world application evidence is required to fully verify this level.
            </p>
          ) : null}
          {assessmentResult.requiresInterview ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              A short defense interview may still be required.
            </p>
          ) : null}
        </section>
      ) : grade ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">Overall score</p>
            <Badge variant={grade.passed ? 'default' : 'destructive'}>
              {grade.passed ? 'Passed' : 'Did not pass'}
            </Badge>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{String(grade.scorePercent)}%</p>
          {grade.mcqTotal > 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {String(grade.mcqCorrect)} of {String(grade.mcqTotal)} multiple-choice questions
              correct
              {grade.traceTotal > 0
                ? ` · ${String(grade.traceCorrect)} of ${String(grade.traceTotal)} trace questions correct`
                : ''}
            </p>
          ) : null}
        </section>
      ) : null}

      {assessmentResult?.targetedAssessmentSkipped ? (
        <section
          role="status"
          className="rounded-[var(--radius-card)] border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <p className="font-medium">Targeted follow-up skipped</p>
          <p className="mt-1 leading-relaxed">
            {targetedAssessmentSkipMessage(assessmentResult.targetedAssessmentSkipReason)}
          </p>
        </section>
      ) : null}

      {assessmentResult && catalogSkillCode ? (
        <CompetencyResultsGrid skillCode={catalogSkillCode} assessmentResult={assessmentResult} />
      ) : null}

      {catalogSkillCode ? (
        <>
          <SkillEvidenceInferencePanel skillCode={catalogSkillCode} />
          <SkillLevelExplanationPanel skillCode={catalogSkillCode} />
        </>
      ) : null}

      {assessmentResult && !intelligenceResult && assessmentResult.uncertainties.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-sm">
          <p>
            Supported proficiency: <strong>{demonstratedLabel}</strong>
          </p>
          <p className="mt-2 text-[var(--text-muted)]">
            Areas to strengthen: {assessmentResult.uncertainties.slice(0, 3).join(', ')}
            {assessmentResult.uncertainties.length > 3 ? '…' : ''}
          </p>
        </section>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="primary" className="flex-1" onClick={onDone}>
          Back to Skills
        </Button>
        <Link
          href="/assessment"
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-background"
        >
          View assessments
        </Link>
      </div>
    </div>
  );
}
