'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmDialogVariant } from '@smart/ui';
import { CAMPUS_ACCESS_REASON_MIN } from '@smart/contracts';

/**
 * A ConfirmDialog that also collects a reason (Deny, Revoke, Cancel event). The reason must be at least
 * CAMPUS_ACCESS_REASON_MIN characters, checked here so the user is told before anything is sent. If the
 * request fails the dialog stays open with the reason intact, so a retry loses nothing.
 */
export function ReasonConfirmDialog({
  open,
  title,
  description,
  confirmText,
  variant = 'danger',
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmText: string;
  variant?: ConfirmDialogVariant;
  onClose: () => void;
  /** Resolve to close the dialog; throw to keep it open and show the error. */
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function confirm() {
    const trimmed = reason.trim();
    if (trimmed.length < CAMPUS_ACCESS_REASON_MIN) {
      setError(`Give a reason of at least ${CAMPUS_ACCESS_REASON_MIN} characters.`);
      return;
    }
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : 'Something went wrong. Try again.',
      );
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={confirm}
      title={title}
      variant={variant}
      confirmText={confirmText}
      error={error}
      description={
        <div className="space-y-3 text-left">
          <div>{description}</div>
          <label className="block text-xs font-semibold text-zinc-700">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              aria-invalid={error ? true : undefined}
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
      }
    />
  );
}
