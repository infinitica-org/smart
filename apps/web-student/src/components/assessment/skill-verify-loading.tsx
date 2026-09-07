'use client';

import { Loader2 } from 'lucide-react';
import { Alert, Card, CardDescription, CardHeader, CardTitle } from '@smart/ui';

export function SkillVerifyLoading({
  generating,
  error,
}: {
  generating: boolean;
  error: string | null;
}) {
  const title = generating ? 'Building your assessment' : 'Preparing the exam room';
  const detail = generating
    ? 'Writing questions for this focus. This usually takes a few seconds.'
    : 'Camera and fullscreen checks passed. Generating your form next.';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Skill verification</h1>
        <p className="text-xs text-[var(--text-secondary)]">Do not leave fullscreen</p>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg border-white/10 bg-[var(--surface)]">
          <CardHeader className="mb-5">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{detail}</CardDescription>
          </CardHeader>
          {error ? (
            <Alert tone="danger" title="Could not generate">
              {error}
            </Alert>
          ) : (
            <div className="space-y-3" aria-hidden>
              <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
              <div className="h-24 animate-pulse rounded-xl bg-white/5" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 animate-pulse rounded-lg bg-white/5" />
                <div className="h-10 animate-pulse rounded-lg bg-white/5" />
                <div className="h-10 animate-pulse rounded-lg bg-white/5" />
                <div className="h-10 animate-pulse rounded-lg bg-white/5" />
              </div>
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {generating ? 'Generating form' : 'Waiting for proctoring checks'}
          </p>
        </Card>
      </div>
    </div>
  );
}
