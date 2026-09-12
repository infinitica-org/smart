'use client';

import type { AssessmentResult, GradeSdeSkillFormResponse } from '@smart/contracts';
import { Badge, Button } from '@smart/ui';

export function SkillVerifyReport({
  grade,
  assessmentResult,
  onDone,
}: {
  grade: GradeSdeSkillFormResponse;
  assessmentResult?: AssessmentResult | null;
  onDone: () => void;
}) {
  const mcqWrong = grade.mcqTotal - grade.mcqCorrect;
  const codingRows = grade.itemResults.filter((row) => row.format === 'CODING');
  const otherOpen = grade.itemResults.filter(
    (row) => row.format !== 'CODING' && row.format !== 'MCQ' && row.format !== 'TRACE',
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 text-[var(--text-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Verification summary</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {grade.skillCode} · {grade.proficiency} · {String(grade.scorePercent)}%
          </p>
        </div>
        <Badge variant={grade.passed ? 'default' : 'destructive'}>
          {grade.passed ? 'Passed' : 'Did not pass'}
        </Badge>
      </header>

      {assessmentResult ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-medium">Competency assessment</h2>
          <p className="mt-2 text-sm">
            Supported proficiency:{' '}
            <strong>{assessmentResult.highestAssessmentSupportedProficiency}</strong> · Confidence:{' '}
            {assessmentResult.confidence.toLowerCase()}
          </p>
          {assessmentResult.uncertainties.length > 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Gaps: {assessmentResult.uncertainties.join(', ')}
            </p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {assessmentResult.competencyResults
              .filter((row) => row.status !== 'NOT_TESTED')
              .map((row) => (
                <li key={row.competencyId}>
                  {row.status.replaceAll('_', ' ').toLowerCase()} · {row.confidence.toLowerCase()}{' '}
                  confidence
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-medium">Multiple choice</h2>
        <p className="mt-2 text-sm">
          {String(grade.mcqCorrect)} correct, {String(mcqWrong)} wrong
          {grade.mcqTotal > 0 ? ` (${String(grade.mcqTotal)} MCQs)` : ''}
        </p>
        {grade.traceTotal > 0 ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Trace: {String(grade.traceCorrect)} of {String(grade.traceTotal)} correct
          </p>
        ) : null}
      </section>

      {codingRows.map((row) => (
        <section
          key={row.index}
          className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4"
        >
          <h2 className="text-sm font-medium">Coding question {String(row.index)}</h2>
          <p className="mt-2 text-sm">
            {String(row.marksEarned)} / {String(row.marksMax)} marks
            {row.testsTotal != null
              ? ` · ${String(row.testsPassed ?? 0)} of ${String(row.testsTotal)} hidden tests passed`
              : ''}
          </p>
          {row.feedback ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
              {row.feedback}
            </p>
          ) : null}
          {row.missedTests && row.missedTests.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                What you missed
              </p>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {row.missedTests.map((missed, index) => (
                  <li
                    key={`${missed.input}-${String(index)}`}
                    className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 font-mono text-xs"
                  >
                    <p>Input: {missed.input}</p>
                    <p>Expected: {missed.expected}</p>
                    <p className="mt-1 font-sans text-[var(--text-muted)]">{missed.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}

      {otherOpen.map((row) => (
        <section
          key={row.index}
          className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4"
        >
          <h2 className="text-sm font-medium">
            {row.format} · question {String(row.index)}
          </h2>
          <p className="mt-2 text-sm">
            {String(row.marksEarned)} / {String(row.marksMax)} marks
          </p>
          {row.feedback ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
              {row.feedback}
            </p>
          ) : null}
        </section>
      ))}

      <Button type="button" variant="primary" onClick={onDone}>
        Back to skills
      </Button>
    </div>
  );
}
