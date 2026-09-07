'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@smart/ui';
import type { ProctoringViolationKind } from '@smart/contracts';
import { isFaceAlignmentKind } from '../../lib/proctoring/live-webcam';

export const INTEGRITY_LOCKOUT_SECONDS = 12;
export const INTEGRITY_WARNING_MS = 5_000;
export const FACE_ALIGNMENT_HOLD_MS = 3_000;

export function FaceAlignmentBlackout({
  liveKind,
  onDismiss,
}: {
  liveKind: ProctoringViolationKind | null;
  onDismiss: () => void;
}) {
  const aligned = !isFaceAlignmentKind(liveKind);
  const [holdMs, setHoldMs] = useState(0);

  useEffect(() => {
    if (!aligned) {
      setHoldMs(0);
      return undefined;
    }
    const started = Date.now();
    const tick = window.setInterval(() => {
      setHoldMs(Date.now() - started);
    }, 100);
    const done = window.setTimeout(onDismiss, FACE_ALIGNMENT_HOLD_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [aligned, onDismiss]);

  const secondsLeft = aligned
    ? Math.max(1, Math.ceil((FACE_ALIGNMENT_HOLD_MS - holdMs) / 1000))
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black p-6 text-center text-white"
      role="alert"
      aria-live="assertive"
      aria-label="Look at the screen"
    >
      <p className="text-3xl font-semibold tracking-tight">Look at the screen</p>
      <p className="mt-4 max-w-md text-sm text-white/70">
        {aligned
          ? `Stay in frame. This lifts in ${String(secondsLeft)} seconds.`
          : 'Sit facing the camera with one clearly lit face. The challenge stays hidden until you are aligned.'}
      </p>
    </div>
  );
}

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
        You reached {String(limit)} integrity warnings. This challenge is closed and flagged for
        review. Answers already saved are kept.
        <p className="mt-3">Heading back in {String(secondsLeft)} seconds.</p>
      </Alert>
    </div>
  );
}
