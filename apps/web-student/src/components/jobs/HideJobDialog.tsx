'use client';

import { useState } from 'react';
import { Button, Modal } from '@smart/ui';

const REASONS = ['Not relevant to me', 'Wrong location', 'Not the right level', 'Other'] as const;

interface HideJobDialogProps {
  open: boolean;
  jobTitle: string;
  onClose: () => void;
  /** `reason` is optional: hiding never requires an explanation. */
  onConfirm: (reason: string | undefined) => void;
}

/** Hide a job with an optional reason (Th6-385). The Undo toast lives with the caller. */
export function HideJobDialog({ open, jobTitle, onClose, onConfirm }: HideJobDialogProps) {
  const [reason, setReason] = useState<string>('');
  return (
    <Modal open={open} onClose={onClose} title={`Hide ${jobTitle}?`}>
      <div className="space-y-3">
        <p className="text-sm">
          You won't see this job in your list or top matches again. You can undo right after.
        </p>
        <fieldset>
          <legend className="text-xs font-semibold">Why? (optional)</legend>
          {REASONS.map((option) => (
            <label key={option} className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="hide-reason"
                checked={reason === option}
                onChange={() => setReason(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(reason || undefined);
              setReason('');
            }}
          >
            Hide job
          </Button>
        </div>
      </div>
    </Modal>
  );
}
