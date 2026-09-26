'use client';

import { useRef, useState } from 'react';
import { Alert, Button, Modal } from '@smart/ui';
import { MESSAGE_MAX_LENGTH, UniversityMessageStudentRequestSchema } from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';
import { universityApi } from '../../lib/api';

/**
 * Th6-442 — message (or offer help to) one student. The draft survives a failed send, and the same
 * Idempotency-Key is reused for every retry of that draft, so a retry can never send the message twice.
 */
export function MessageStudentModal({
  studentId,
  studentName,
  open,
  onClose,
  onSent,
}: {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  async function send() {
    const parsed = UniversityMessageStudentRequestSchema.safeParse({
      subject: subject.trim() || undefined,
      body,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0] ?? 'body')] ??= issue.message;
      }
      setFieldErrors(errors);
      setFormError(null);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSending(true);
    try {
      await universityApi.messageStudent(studentId, idempotencyKey.current, parsed.data);
      // Sent: the next draft is a new message and gets its own key.
      idempotencyKey.current = crypto.randomUUID();
      setSubject('');
      setBody('');
      onSent();
      onClose();
    } catch (error) {
      if (error instanceof SmartApiError && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors);
      }
      setFormError(
        error instanceof Error && error.message
          ? `${error.message} Your message was not lost — you can try again.`
          : 'Could not send the message. Your message was not lost — you can try again.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Message ${studentName}`}
      description="The student is notified in the app."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={() => void send()} disabled={sending}>
            {sending ? 'Sending…' : formError ? 'Retry' : 'Send message'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <div>
          <label htmlFor="uni-msg-subject" className="text-xs font-semibold">
            Subject (optional)
          </label>
          <input
            id="uni-msg-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={120}
            aria-invalid={fieldErrors.subject ? true : undefined}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {fieldErrors.subject ? (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {fieldErrors.subject}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="uni-msg-body" className="text-xs font-semibold">
            Message
          </label>
          <textarea
            id="uni-msg-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            aria-invalid={fieldErrors.body ? true : undefined}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span role={fieldErrors.body ? 'alert' : undefined} className="text-red-600">
              {fieldErrors.body ?? ''}
            </span>
            <span className="text-zinc-500">
              {body.length}/{MESSAGE_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
