'use client';

import { useEffect } from 'react';
import { Alert } from '@smart/ui';

export const INTEGRITY_LOCKOUT_SECONDS = 12;
export const INTEGRITY_WARNING_MS = 5_000;

export function IntegrityWarningModal({
  count,
  limit,
  onDismiss,
}: {
  count: number;
  limit: number;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, INTEGRITY_WARNING_MS);
    return () => window.clearTimeout(timer);
  }, [count, limit, onDismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-6"
      role="status"
      aria-live="polite"
      aria-label="Integrity warning"
    >
      <Alert tone="warning" title="Integrity warning" className="max-w-md bg-[#1a1a1a] text-white">
        <p>
          Warning {String(count)} of {String(limit)}. Further violations can end this attempt. This
          message closes in 5 seconds.
        </p>
      </Alert>
    </div>
  );
}

export function IntegrityLockoutPanel({
  limit,
  secondsLeft,
}: {
  limit: number;
  secondsLeft: number;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Alert tone="danger" title="Test terminated" className="max-w-md">
        You reached {String(limit)} integrity warnings. This attempt is closed and flagged for
        review. Answers already saved are kept.
        <p className="mt-3">Returning to assessments in {String(secondsLeft)} seconds.</p>
      </Alert>
    </div>
  );
}
