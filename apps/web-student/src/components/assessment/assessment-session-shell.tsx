'use client';

import type { ReactNode } from 'react';

export function SessionProgressBar({
  value,
  label,
}: {
  /** 0–1 */
  value: number;
  label?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const pct = Math.round(clamped * 100);
  return (
    <div className="shrink-0 border-b border-[var(--surface-border)] bg-[var(--surface)]">
      <div
        className="h-1 bg-brand-700 transition-[width] duration-300 ease-out"
        style={{ width: `${String(pct)}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Session progress'}
      />
      {label ? (
        <p className="px-6 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export function VoiceActivityBars({ active }: { active: boolean }) {
  const heights = [0.35, 0.65, 1, 0.55, 0.8, 0.45];
  return (
    <div
      className="flex h-8 items-end justify-center gap-1"
      aria-hidden={!active}
      aria-label={active ? 'Listening' : undefined}
    >
      {heights.map((scale, index) => (
        <span
          key={String(index)}
          className={
            active
              ? 'w-1 origin-bottom animate-pulse rounded-full bg-brand-700'
              : 'w-1 rounded-full bg-[var(--surface-border)]'
          }
          style={
            active
              ? {
                  height: `${String(Math.round(scale * 100))}%`,
                  animationDelay: `${String(index * 90)}ms`,
                  animationDuration: '680ms',
                }
              : { height: '28%' }
          }
        />
      ))}
    </div>
  );
}

export function AssessmentSessionShell({
  title,
  subtitle,
  headerAction,
  progressValue,
  progressLabel,
  main,
  aside,
}: {
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  /** 0–1 session progress for the top bar */
  progressValue?: number;
  progressLabel?: string;
  main: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[100dvh] w-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </header>

      {progressValue !== undefined ? (
        <SessionProgressBar value={progressValue} label={progressLabel} />
      ) : null}

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{main}</div>
        <aside className="flex min-h-0 w-full flex-col gap-4 overflow-hidden lg:w-[22rem]">
          {aside}
        </aside>
      </div>
    </div>
  );
}

export function SessionAsidePanel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4 ${className}`}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}
