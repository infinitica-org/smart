'use client';

import type { SdeSkillFormFormat, SkillVerifySessionDto } from '@smart/contracts';
import { AnswerOption, Badge, Button, ProgressIndicator, QuestionCard, Timer } from '@smart/ui';

const FORMAT_LABEL: Record<SdeSkillFormFormat, string> = {
  MCQ: 'Single Choice',
  TRACE: 'Trace',
  CODING: 'Coding',
  SCENARIO: 'Scenario',
  DEBUG: 'Debug',
  DESIGN_REASONING: 'Design reasoning',
};

export function skillVerifyTimerProps(session: SkillVerifySessionDto) {
  const duration = session.timeMinutes * 60;
  const expires = Date.parse(session.expiresAt);
  return {
    duration,
    startedAt: new Date(expires - duration * 1000).toISOString(),
    serverNow: new Date(expires - session.serverRemainingSeconds * 1000).toISOString(),
  };
}

export function isSkillVerifyAnswered(
  answer:
    | {
        selectedKey?: string;
        text?: string;
      }
    | undefined,
) {
  if (!answer) return false;
  if (answer.selectedKey) return true;
  return Boolean(answer.text?.trim());
}

export function SkillVerifyExam({
  session,
  currentIndex,
  answers,
  pending,
  error,
  onSelectKey,
  onChangeText,
  onGoTo,
  onClear,
  onExit,
  onSubmit,
}: {
  session: SkillVerifySessionDto;
  currentIndex: number;
  answers: Record<number, { selectedKey?: string; text?: string }>;
  pending: boolean;
  error: string | null;
  onSelectKey: (itemIndex: number, key: 'A' | 'B' | 'C' | 'D') => void;
  onChangeText: (itemIndex: number, text: string) => void;
  onGoTo: (index: number) => void;
  onClear: (itemIndex: number) => void;
  onExit: () => void;
  onSubmit: () => void;
}) {
  const total = session.items.length;
  const item = session.items[currentIndex];
  const last = currentIndex >= total - 1;
  if (!item) return null;

  const answer = answers[item.index];
  const optionKeys = item.options
    ? (Object.keys(item.options) as Array<'A' | 'B' | 'C' | 'D'>)
    : [];

  return (
    <div className="flex h-full min-h-[100dvh] w-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Skill verification</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onExit}>
            Exit
          </Button>
          <Button type="button" variant="primary" disabled={pending} onClick={onSubmit}>
            Submit assessment
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
            <Badge variant="secondary">{session.proficiency}</Badge>
            <span>{FORMAT_LABEL[item.format]}</span>
            <span>Pass bar {String(session.passMarkPercent)}%</span>
            <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-[var(--text-primary)]">
              Total questions: {String(total)}
            </span>
          </div>

          {error ? (
            <p className="mb-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <QuestionCard
            className="min-h-0 flex-1 overflow-y-auto"
            eyebrow={
              <span className="inline-flex rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                <ProgressIndicator current={currentIndex + 1} total={total} />
              </span>
            }
            questionText={<span className="whitespace-pre-wrap">{item.prompt}</span>}
          >
            {item.options ? (
              <div
                className="flex flex-col gap-3"
                role="radiogroup"
                aria-label={`Question ${String(item.index)} options`}
              >
                {optionKeys.map((key) => (
                  <AnswerOption
                    key={key}
                    label={`${key}. ${item.options?.[key] ?? ''}`}
                    selected={answer?.selectedKey === key}
                    onClick={() => onSelectKey(item.index, key)}
                  />
                ))}
              </div>
            ) : (
              <textarea
                className="min-h-40 w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-primary)]"
                value={answer?.text ?? ''}
                onChange={(event) => onChangeText(item.index, event.target.value)}
                aria-label="Written response"
              />
            )}
          </QuestionCard>

          <div className="mt-6 flex shrink-0 items-center justify-between border-t border-[var(--surface-border)] pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0 || pending}
              onClick={() => onGoTo(currentIndex - 1)}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending || !isSkillVerifyAnswered(answer)}
                onClick={() => onClear(item.index)}
              >
                Clear response
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={last || pending}
                onClick={() => onGoTo(currentIndex + 1)}
              >
                Next question
              </Button>
            </div>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <div className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Time remaining
            </p>
            <Timer {...skillVerifyTimerProps(session)} />
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <p className="mb-3 text-sm font-medium">Questions</p>
            <div className="grid grid-cols-5 gap-2">
              {session.items.map((row, index) => {
                const answered = isSkillVerifyAnswered(answers[row.index]);
                const active = index === currentIndex;
                return (
                  <button
                    key={row.index}
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Question ${String(index + 1)}${answered ? ', answered' : ''}`}
                    className={
                      active
                        ? 'h-9 rounded-md bg-brand-700 text-sm font-medium text-paper'
                        : answered
                          ? 'h-9 rounded-md bg-brand-500/20 text-sm font-medium text-[var(--text-primary)]'
                          : 'h-9 rounded-md border border-[var(--surface-border)] bg-[var(--surface)] text-sm text-[var(--text-primary)]'
                    }
                    onClick={() => onGoTo(index)}
                  >
                    {String(index + 1)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-brand-500/20" />
                Answered
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-[var(--surface-border)]" />
                Unanswered
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
