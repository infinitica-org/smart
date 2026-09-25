'use client';

import { useRef, useState } from 'react';
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type Message,
  type ReportReason,
} from '@smart/contracts';
import { useMutation, useSmartApi } from '../api-provider';
import { Alert } from '../components/alert';
import { Button } from '../components/button';
import { Modal } from '../components/modal';
import { messageErrorText, newIdempotencyKey } from './messaging-utils';

const REASON_LABEL: Record<ReportReason, string> = {
  SCAM: 'Scam or fraud',
  DISCRIMINATORY: 'Harassment or discrimination',
  MISLEADING: 'Misleading or false',
  OTHER: 'Something else',
};

/** Th6-427 — report one message. Reporting the same message twice is harmless: the second returns the first. */
export function ReportMessageDialog(props: {
  message: Message | null;
  onClose: () => void;
  onReported: () => void;
}) {
  const api = useSmartApi();
  const [reason, setReason] = useState<ReportReason>('DISCRIMINATORY');
  const [details, setDetails] = useState('');
  const keyRef = useRef(newIdempotencyKey());
  const message = props.message;

  const report = useMutation({
    mutationFn: () => {
      if (!message) throw new Error('No message selected');
      return api.messaging.reportMessage(
        {
          targetType: 'MESSAGE',
          targetId: message.id,
          reason,
          ...(details.trim() ? { details: details.trim() } : {}),
        },
        keyRef.current,
      );
    },
    onSuccess: () => {
      setDetails('');
      keyRef.current = newIdempotencyKey();
      props.onReported();
    },
  });

  const needsDetails = reason === 'OTHER' && details.trim().length < 10;

  return (
    <Modal
      open={message !== null}
      onClose={props.onClose}
      title="Report this message"
      description="Our trust and safety team will review it. The other person is not told who reported it."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={props.onClose} disabled={report.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => report.mutate()}
            disabled={report.isPending || needsDetails}
          >
            {report.isPending ? 'Reporting…' : 'Report'}
          </Button>
        </div>
      }
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Why are you reporting it?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="report-reason"
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {REASON_LABEL[r]}
          </label>
        ))}
      </fieldset>
      <label className="mt-3 block text-sm font-medium" htmlFor="report-details">
        Details {reason === 'OTHER' ? '(required)' : '(optional)'}
      </label>
      <textarea
        id="report-details"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        maxLength={REPORT_DETAILS_MAX_LENGTH}
        rows={3}
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {report.error ? (
        <Alert tone="danger" className="mt-3">
          {messageErrorText(report.error)}
        </Alert>
      ) : null}
    </Modal>
  );
}
