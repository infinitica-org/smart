'use client';

import { Alert } from '@smart/ui';
import { SkillVerifyWaitGame } from './skill-verify-wait-game';

export function SkillVerifyLoading({
  generating,
  error,
  kioskTitle = 'Skill verification',
}: {
  generating: boolean;
  error: string | null;
  kioskTitle?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <h1 className="truncate text-lg font-semibold tracking-tight">{kioskTitle}</h1>
        <p className="text-xs text-[var(--text-secondary)]">Warming up your round</p>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface)] p-5 shadow-xl">
          {error ? (
            <Alert tone="danger" title="Could not generate">
              {error}
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
