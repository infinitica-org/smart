'use client';

import { Alert } from '@smart/ui';
import type { SkillVerifyError } from '@/lib/skill-verify-errors';
import { SkillVerifyWaitGame } from './skill-verify-wait-game';

export function SkillVerifyLoading({
  generating,
  error,
  kioskTitle = 'Skill verification',
}: {
  generating: boolean;
  error: SkillVerifyError | null;
  kioskTitle?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{kioskTitle}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Preparing your session — complete camera checks to begin
          </p>
        </div>
        <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Warming up
        </p>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[var(--surface)] p-5 shadow-xl">
          {error ? (
            <Alert tone="danger" title={error.title}>
              {error.message}
              {error.retryAfterSeconds
                ? ` Try again in ${String(error.retryAfterSeconds)} seconds.`
                : null}
            </Alert>
          ) : (
            <SkillVerifyWaitGame />
          )}
          <p className="sr-only" aria-live="polite">
            {generating ? 'Your round is still loading' : 'Hold on — camera checks first'}
          </p>
        </div>
      </div>
    </div>
  );
}
