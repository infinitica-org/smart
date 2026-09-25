'use client';

import { useRef, useState, type ReactNode } from 'react';
import { MESSAGE_MAX_LENGTH, type StartConversationRequest } from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';
import { useMutation, useSmartApi } from '../api-provider';
import { Alert } from '../components/alert';
import { Button } from '../components/button';
import { Modal } from '../components/modal';
import { messageErrorText, newIdempotencyKey } from './messaging-utils';

export interface StartConversationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Exactly one of these: an employer names the applicant, an advisor names the student. */
  target: { applicationId: string } | { recipientId: string };
  recipientName: string;
  onStarted: (conversationId: string) => void;
  /** Shown under the refusal message when the company is not verified (Th6-429). */
  verificationHint?: ReactNode;
}

/** Th6-422/423 — the "Message" entry point: one dialog, used from the candidate panel and the advisor view. */
export function StartConversationDialog({
  open,
  onClose,
  target,
  recipientName,
  onStarted,
  verificationHint,
}: StartConversationDialogProps) {
  const api = useSmartApi();
  const [body, setBody] = useState('');
  // One key per attempt: a retry after a network failure is the same message, never a second one.
  const keyRef = useRef(newIdempotencyKey());

  const start = useMutation({
    mutationFn: () => {
      const request: StartConversationRequest = { ...target, body: body.trim() };
      return api.messaging.start(request, keyRef.current);
    },
    onSuccess: (result) => {
      setBody('');
      keyRef.current = newIdempotencyKey();
      onStarted(result.conversationId);
    },
  });

  const error = start.error;
  const notVerified = error instanceof SmartApiError && error.code === 'employer_not_verified';
  const tooLong = body.length > MESSAGE_MAX_LENGTH;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Message ${recipientName}`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={start.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => start.mutate()}
            disabled={start.isPending || body.trim().length === 0 || tooLong}
          >
            {start.isPending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      }
    >
      <label className="block text-sm font-medium" htmlFor="start-conversation-body">
        Your message
      </label>
      <textarea
        id="start-conversation-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={5}
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        placeholder="Introduce yourself and say why you are getting in touch."
      />
      <p className={`mt-1 text-xs ${tooLong ? 'text-red-600' : 'text-neutral-500'}`}>
        {body.length}/{MESSAGE_MAX_LENGTH}
      </p>
      {error ? (
        <Alert tone="danger" className="mt-3">
          {messageErrorText(error)}
          {notVerified ? <div className="mt-1">{verificationHint}</div> : null}
        </Alert>
      ) : null}
    </Modal>
  );
}
