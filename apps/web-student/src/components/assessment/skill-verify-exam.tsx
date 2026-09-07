'use client';

import { useRef } from 'react';
import type {
  SdeSkillFormFormat,
  SdeSkillFormPublicItem,
  SkillVerifySessionDto,
} from '@smart/contracts';
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

type ProseBlock =
  { type: 'p'; text: string } | { type: 'ol'; items: string[] } | { type: 'ul'; items: string[] };

export function splitProblemProse(text: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];
  let list: { type: 'ol' | 'ul'; items: string[] } | null = null;

  const flushParagraph = () => {
    const joined = paragraph.join(' ').trim();
    if (joined) blocks.push({ type: 'p', text: joined });
    paragraph = [];
  };
  const flushList = () => {
    if (list && list.items.length > 0) blocks.push(list);
    list = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (numbered?.[1]) {
      flushParagraph();
      if (list?.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    if (bullet?.[1]) {
      flushParagraph();
      if (list?.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
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
  const coding = item.format === 'CODING';

  return (
    <div className="flex h-full min-h-[100dvh] w-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Skill verification</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onExit}>
            Exit
          </Button>
          <Button type="button" variant="primary" disabled={pending} onClick={onSubmit}>
            Submit and see results
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
            <Badge variant="secondary">{session.proficiency}</Badge>
            <span>{FORMAT_LABEL[item.format]}</span>
            <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-[var(--text-primary)]">
              Total questions: {String(total)}
            </span>
          </div>

          {error ? (
            <p className="mb-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          {coding ? (
            <div className="grid min-h-0 flex-1 overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] lg:grid-cols-2">
              <div className="min-h-0 overflow-y-auto border-b border-[var(--surface-border)] p-5 lg:border-b-0 lg:border-r">
                <p className="mb-4 text-xs font-medium text-[var(--text-muted)]">
                  <ProgressIndicator current={currentIndex + 1} total={total} />
                </p>
                <CodingProblemPrompt item={item} />
              </div>
              <SolutionEditor
                value={answer?.text ?? ''}
                onChange={(text) => onChangeText(item.index, text)}
              />
            </div>
          ) : (
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
          )}

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
              {last ? (
                <Button type="button" variant="primary" disabled={pending} onClick={onSubmit}>
                  Submit and see results
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onGoTo(currentIndex + 1)}
                >
                  Next question
                </Button>
              )}
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

function CodingProblemPrompt({ item }: { item: SdeSkillFormPublicItem }) {
  const blocks = splitProblemProse(item.prompt);
  return (
    <article className="flex flex-col gap-5 text-sm leading-relaxed">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
        {item.title ?? 'Coding problem'}
      </h2>
      {blocks.map((block, index) => {
        if (block.type === 'p') {
          return (
            <p key={`p-${String(index)}`} className="text-[var(--text-primary)]">
              {block.text}
            </p>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol
              key={`ol-${String(index)}`}
              className="list-decimal space-y-2 pl-5 text-[var(--text-primary)]"
            >
              {block.items.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ol>
          );
        }
        return (
          <ul
            key={`ul-${String(index)}`}
            className="list-disc space-y-2 pl-5 text-[var(--text-primary)]"
          >
            {block.items.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        );
      })}
      {item.examples && item.examples.length > 0 ? (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Examples
          </h3>
          <div className="flex flex-col gap-3">
            {item.examples.map((example, index) => (
              <div
                key={`${example.input}-${String(index)}`}
                className="overflow-hidden rounded-lg border border-[var(--surface-border)]"
              >
                <p className="border-b border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                  Example {String(index + 1)}
                </p>
                <div className="grid gap-0 sm:grid-cols-2">
                  <div className="border-b border-[var(--surface-border)] p-3 sm:border-b-0 sm:border-r">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Input
                    </p>
                    <pre className="whitespace-pre-wrap font-mono text-xs">{example.input}</pre>
                  </div>
                  <div className="p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Output
                    </p>
                    <pre className="whitespace-pre-wrap font-mono text-xs">{example.output}</pre>
                  </div>
                </div>
                {example.explanation ? (
                  <p className="border-t border-[var(--surface-border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                    {example.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {item.constraints ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Constraints
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-[var(--text-muted)]">
            {splitProblemProse(item.constraints).flatMap((block) => {
              if (block.type === 'p') return [<li key={block.text}>{block.text}</li>];
              return block.items.map((entry) => <li key={entry}>{entry}</li>);
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function SolutionEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const lineCount = Math.max(value.split('\n').length, 12);
  const lines = Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n');

  return (
    <div className="flex min-h-[22rem] flex-col bg-[#111827] lg:min-h-0">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-white/55">Solution</span>
        <span className="text-[10px] text-white/35">Tab inserts spaces</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <pre
          ref={gutterRef}
          aria-hidden
          className="select-none overflow-hidden border-r border-white/10 px-2 py-3 text-right font-mono text-xs leading-6 text-white/30"
        >
          {lines}
        </pre>
        <textarea
          className="min-h-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-sm leading-6 text-[#e5e7eb] outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            event.preventDefault();
            const target = event.currentTarget;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const next = `${value.slice(0, start)}  ${value.slice(end)}`;
            onChange(next);
            requestAnimationFrame(() => {
              target.selectionStart = start + 2;
              target.selectionEnd = start + 2;
            });
          }}
          aria-label="Code solution"
          placeholder="Write your solution"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}
