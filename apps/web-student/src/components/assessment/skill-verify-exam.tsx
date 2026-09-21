'use client';

import { useRef, useState } from 'react';
import {
  splitTracePromptForDisplay,
  type RunSdeSkillFormCodeResponse,
  type SdeSkillFormFormat,
  type SdeSkillFormPublicItem,
  type SkillVerifySessionDto,
} from '@smart/contracts';
import { AnswerOption, Badge, Button, ProgressIndicator, QuestionCard, Timer } from '@smart/ui';
import {
  AssessmentSessionShell,
  SessionAsidePanel,
} from '@/components/assessment/assessment-session-shell';
import { CameraIntegrityDock } from '@/components/proctoring/camera-integrity-dock';
import { formatSkillVerifyKioskTitle } from '@/lib/skill-declarations';
import {
  areAllSkillVerifyItemsAnswered,
  isSkillVerifyAnswered,
  type SkillVerifyError,
} from '@/lib/skill-verify-errors';

const SUBMIT_LABEL_BY_STAGE = {
  DIAGNOSTIC: 'Finish diagnostic',
  COMPLETE: 'Submit and see results',
} as const;

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

export { isSkillVerifyAnswered } from '@/lib/skill-verify-errors';

type ProseBlock =
  { type: 'p'; text: string } | { type: 'ol'; items: string[] } | { type: 'ul'; items: string[] };

export type PromptSegment =
  { type: 'prose'; text: string } | { type: 'code'; text: string; language: string };

export function splitPromptSegments(text: string): PromptSegment[] {
  const segments: PromptSegment[] = [];
  const fence = /```(\w*)[\s\r\n]*([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null = fence.exec(text);
  while (match) {
    const before = text.slice(cursor, match.index).trim();
    if (before) segments.push({ type: 'prose', text: before });
    segments.push({
      type: 'code',
      language: match[1] && match[1].length > 0 ? match[1] : 'text',
      text: (match[2] ?? '').replace(/\n$/, ''),
    });
    cursor = fence.lastIndex;
    match = fence.exec(text);
  }
  const rest = text.slice(cursor).trim();
  if (rest) segments.push({ type: 'prose', text: rest });
  if (segments.length === 0) segments.push({ type: 'prose', text });
  return segments;
}

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
  kioskTitle,
  stageNotice,
  onDismissStageNotice,
  onSelectKey,
  onChangeText,
  onGoTo,
  onClear,
  onExit,
  onSubmit,
  onRunCode,
}: {
  session: SkillVerifySessionDto;
  currentIndex: number;
  answers: Record<number, { selectedKey?: string; text?: string }>;
  pending: boolean;
  error: SkillVerifyError | null;
  kioskTitle?: string;
  stageNotice?: string | null;
  onDismissStageNotice?: () => void;
  onSelectKey: (itemIndex: number, key: 'A' | 'B' | 'C' | 'D') => void;
  onChangeText: (itemIndex: number, text: string) => void;
  onGoTo: (index: number) => void;
  onClear: (itemIndex: number) => void;
  onExit: () => void;
  onSubmit: () => void;
  onRunCode?: (
    item: SdeSkillFormPublicItem,
    source: string,
  ) => Promise<RunSdeSkillFormCodeResponse>;
}) {
  const [runBusy, setRunBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunSdeSkillFormCodeResponse | null>(null);
  const total = session.items.length;
  const item = session.items[currentIndex];
  const last = currentIndex >= total - 1;
  if (!item) return null;

  const answer = answers[item.index];
  const optionKeys = item.options
    ? (Object.keys(item.options) as Array<'A' | 'B' | 'C' | 'D'>)
    : [];
  const coding = item.format === 'CODING';
  const trace = item.format === 'TRACE';
  const debug = item.format === 'DEBUG';
  const studio = coding || trace || debug;

  const heading =
    kioskTitle ?? formatSkillVerifyKioskTitle(session.skillCode, session.stage ?? 'DIAGNOSTIC');
  const submitLabel =
    session.stage && session.stage in SUBMIT_LABEL_BY_STAGE
      ? SUBMIT_LABEL_BY_STAGE[session.stage]
      : 'Submit and see results';
  const allAnswered = areAllSkillVerifyItemsAnswered(session, answers);
  const canSubmit = !pending && allAnswered;
  const answeredCount = session.items.filter((row) =>
    isSkillVerifyAnswered(answers[row.index]),
  ).length;

  const runCode = async () => {
    if (!onRunCode || !coding) return;
    const source = answer?.text?.trim() ?? '';
    if (!source) {
      setRunError('Write a solution before running.');
      setRunResult(null);
      return;
    }
    setRunBusy(true);
    setRunError(null);
    try {
      const next = await onRunCode(item, source);
      setRunResult(next);
    } catch (err) {
      setRunResult(null);
      setRunError(err instanceof Error ? err.message : 'Code could not be run.');
    } finally {
      setRunBusy(false);
    }
  };

  const stageSubtitle =
    session.stage === 'DIAGNOSTIC'
      ? 'Diagnostic round — calibrates your next questions'
      : 'Skill verification — answer every question before time runs out';

  return (
    <AssessmentSessionShell
      title={heading}
      subtitle={stageSubtitle}
      progressValue={total > 0 ? (currentIndex + 1) / total : 0}
      progressLabel={`Question ${String(currentIndex + 1)} of ${String(total)} · ${String(answeredCount)} answered`}
      headerAction={
        <Button type="button" variant="outline" disabled={pending} onClick={onExit}>
          Exit
        </Button>
      }
      main={
        <div className="flex min-h-0 flex-col overflow-hidden">
          {stageNotice ? (
            <div
              role="status"
              className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-foreground/30 bg-foreground/10 px-4 py-3 text-sm text-foreground"
            >
              <p>{stageNotice}</p>
              {onDismissStageNotice ? (
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-foreground hover:underline"
                  onClick={onDismissStageNotice}
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
            {session.intelligenceEnabled && session.stageLabel ? (
              <Badge variant="outline">{session.stageLabel}</Badge>
            ) : (
              <Badge variant="secondary">{session.proficiency}</Badge>
            )}
            <span>{FORMAT_LABEL[item.format]}</span>
            <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-[var(--text-primary)]">
              Total questions: {String(total)}
            </span>
          </div>

          {pending ? (
            <p className="mb-3 text-sm text-[var(--text-muted)]" aria-live="polite">
              {submitLabel === 'Finish diagnostic'
                ? 'Grading your diagnostic…'
                : 'Submitting your assessment…'}
            </p>
          ) : null}

          {error ? (
            <p className="mb-3 text-sm text-danger" role="alert">
              <span className="font-medium">{error.title}.</span> {error.message}
            </p>
          ) : null}

          {!allAnswered ? (
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Answer all {String(total)} questions before submitting.
            </p>
          ) : null}

          {studio ? (
            <div className="grid min-h-0 flex-1 overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] lg:grid-cols-2">
              <div className="min-h-0 overflow-y-auto border-b border-[var(--surface-border)] p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4 text-xs font-medium text-[var(--text-muted)]">
                  <ProgressIndicator current={currentIndex + 1} total={total} />
                </div>
                <ProblemStatement
                  item={item}
                  heading={
                    item.title ??
                    (coding ? 'Coding problem' : debug ? 'Debug' : 'Trace the snippet')
                  }
                />
              </div>
              {trace && item.options ? (
                <TraceAnswerPane
                  itemIndex={item.index}
                  optionKeys={optionKeys}
                  options={item.options}
                  selectedKey={answer?.selectedKey}
                  onSelectKey={onSelectKey}
                />
              ) : (
                <SolutionEditor
                  value={answer?.text ?? ''}
                  onChange={(text) => onChangeText(item.index, text)}
                  label={debug ? 'Root cause and fix' : 'Solution'}
                  placeholder={debug ? 'Describe the bug and the fix' : 'Write your solution'}
                  ariaLabel={debug ? 'Debug response' : 'Code solution'}
                  onRun={coding && onRunCode ? runCode : undefined}
                  runBusy={runBusy}
                  runError={runError}
                  runResult={coding ? runResult : null}
                />
              )}
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
              {last || allAnswered ? (
                <Button type="button" variant="primary" disabled={!canSubmit} onClick={onSubmit}>
                  {pending ? 'Please wait…' : submitLabel}
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
      }
      aside={
        <>
          <CameraIntegrityDock />
          <SessionAsidePanel title="Time remaining">
            <Timer {...skillVerifyTimerProps(session)} />
          </SessionAsidePanel>

          <SessionAsidePanel title="Question map" className="min-h-0 flex-1 overflow-y-auto">
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
                        ? 'h-9 rounded-md bg-brand-700 text-sm font-medium text-paper ring-2 ring-brand-500/40 ring-offset-1 ring-offset-[var(--surface)]'
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
          </SessionAsidePanel>

          <SessionAsidePanel title="Tips">
            <ul className="space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
              <li>
                Use the map to jump between questions — your latest answer is saved when you move.
              </li>
              <li>Stay in fullscreen; integrity warnings can end the attempt.</li>
              <li>Submit only when every question shows as answered.</li>
            </ul>
          </SessionAsidePanel>
        </>
      }
    />
  );
}

function ProblemStatement({ item, heading }: { item: SdeSkillFormPublicItem; heading: string }) {
  const segments: PromptSegment[] =
    item.format === 'TRACE'
      ? splitTracePromptForDisplay(item.prompt)
      : splitPromptSegments(item.prompt).filter(
          (segment) => segment.type !== 'code' || segment.text.trim().length > 0,
        );
  return (
    <article className="flex flex-col gap-5 text-sm leading-relaxed">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{heading}</h2>
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          return (
            <CodeSnippet
              key={`code-${String(index)}`}
              language={segment.language}
              code={segment.text}
            />
          );
        }
        return (
          <TraceProseBlocks
            key={`prose-${String(index)}`}
            text={segment.text}
            muted={/not included in this question/i.test(segment.text)}
          />
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

function TraceProseBlocks({ text, muted = false }: { text: string; muted?: boolean }) {
  if (muted) {
    return (
      <p className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-muted)]">
        {text}
      </p>
    );
  }
  return <ProseBlocks text={text} />;
}

function ProseBlocks({ text }: { text: string }) {
  return (
    <>
      {splitProblemProse(text).map((block, index) => {
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
    </>
  );
}

function CodeSnippet({ language, code }: { language: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[#0f172a]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          {language}
        </span>
        <span className="text-[10px] text-slate-400">Snippet</span>
      </div>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-6 text-slate-100">
        {code}
      </pre>
    </div>
  );
}

function TraceAnswerPane({
  itemIndex,
  optionKeys,
  options,
  selectedKey,
  onSelectKey,
}: {
  itemIndex: number;
  optionKeys: Array<'A' | 'B' | 'C' | 'D'>;
  options: NonNullable<SdeSkillFormPublicItem['options']>;
  selectedKey?: string;
  onSelectKey: (itemIndex: number, key: 'A' | 'B' | 'C' | 'D') => void;
}) {
  return (
    <div className="flex min-h-[22rem] flex-col bg-[#111827] lg:min-h-0">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-white/55">Answer</span>
        <span className="text-[10px] text-white/35">Choose one</span>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
        role="radiogroup"
        aria-label={`Question ${String(itemIndex)} options`}
      >
        {optionKeys.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selectedKey === key}
            onClick={() => onSelectKey(itemIndex, key)}
            className={
              selectedKey === key
                ? 'rounded-md border border-brand-400 bg-brand-500/20 px-3 py-3 text-left text-sm text-[#e5e7eb]'
                : 'rounded-md border border-white/15 bg-white/5 px-3 py-3 text-left text-sm text-[#e5e7eb] hover:bg-white/10'
            }
          >
            <span className="mr-2 font-semibold text-white/70">{key}.</span>
            {options[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

function SolutionEditor({
  value,
  onChange,
  label = 'Solution',
  placeholder = 'Write your solution',
  ariaLabel = 'Code solution',
  onRun,
  runBusy = false,
  runError = null,
  runResult = null,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  onRun?: () => void;
  runBusy?: boolean;
  runError?: string | null;
  runResult?: RunSdeSkillFormCodeResponse | null;
}) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const lineCount = Math.max(value.split('\n').length, 12);
  const lines = Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n');

  return (
    <div className="flex min-h-[22rem] flex-col bg-[#111827] lg:min-h-0">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-white/55">{label}</span>
        <div className="flex items-center gap-2">
          {onRun ? (
            <Button type="button" variant="secondary" disabled={runBusy} onClick={onRun}>
              {runBusy ? 'Running…' : 'Run'}
            </Button>
          ) : (
            <span className="text-[10px] text-white/35">Tab inserts spaces</span>
          )}
        </div>
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
          onChange={(event) => onChange(event.currentTarget.value)}
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
          aria-label={ariaLabel}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
      {onRun ? (
        <div className="max-h-40 shrink-0 overflow-y-auto border-t border-white/10 px-3 py-2 text-xs text-[#e5e7eb]">
          {runError ? (
            <p className="text-danger" role="alert">
              {runError}
            </p>
          ) : null}
          {runResult?.compileError ? (
            <p className="text-danger" role="alert">
              {runResult.compileError}
            </p>
          ) : null}
          {runResult ? (
            <p className="mb-1 text-white/55">
              {String(runResult.testsPassed)}/{String(runResult.testsTotal)} tests passed
            </p>
          ) : null}
          {runResult?.tests.map((test, index) => (
            <p key={`${test.input}-${String(index)}`} className="font-mono text-[11px] leading-5">
              {test.passed ? 'PASS' : 'FAIL'} · {test.input} → {test.actual || test.expected}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
