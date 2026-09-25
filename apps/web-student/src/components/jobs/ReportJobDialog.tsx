'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isSmartApiError } from '@smart/api-client';
import { CreateReportRequestSchema, REPORT_REASONS, type ReportReason } from '@smart/contracts';
import { Button, FormMessage, Modal } from '@smart/ui';
import { api } from '@/lib/api';
import { STUDENT_JOBS_KEY } from './job-cache';

const REASON_LABEL: Record<ReportReason, string> = {
  SCAM: 'Looks like a scam',
  DISCRIMINATORY: 'Discriminatory',
  MISLEADING: 'Misleading or false',
  OTHER: 'Something else',
};

interface ReportJobDialogProps {
  open: boolean;
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  /** Called after the report is saved; the job is hidden for the reporter by the server. */
  onReported: (jobId: string, alreadyReported: boolean) => void;
}

/** Th6-386 — report a suspicious or inappropriate job. */
export function ReportJobDialog({
  open,
  jobId,
  jobTitle,
  onClose,
  onReported,
}: ReportJobDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | undefined>();
  // One key per unchanged payload: retrying after a dropped connection can never file twice.
  const keyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const submit = useMutation({
    mutationFn: (body: ReturnType<typeof CreateReportRequestSchema.parse>) => {
      const fingerprint = JSON.stringify(body);
      if (keyRef.current?.fingerprint !== fingerprint) {
        keyRef.current = { fingerprint, key: crypto.randomUUID() };
      }
      return api.studentJobs.report(body, keyRef.current.key);
    },
    onSuccess: async (report) => {
      await queryClient.invalidateQueries({ queryKey: STUDENT_JOBS_KEY });
      setReason('');
      setDetails('');
      onReported(jobId, report.alreadyReported);
    },
    onError: (err) => {
      const field = isSmartApiError(err) ? err.details[0]?.message : undefined;
      setError(
        field ??
          (isSmartApiError(err) && err.message ? err.message : 'Could not send your report.'),
      );
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = CreateReportRequestSchema.safeParse({
      targetType: 'JOB',
      targetId: jobId,
      reason: reason || undefined,
      details: details.trim() || undefined,
    });
    if (!parsed.success) {
      setError(
        !reason ? 'Choose a reason.' : (parsed.error.issues[0]?.message ?? 'Check your report.'),
      );
      return;
    }
    setError(undefined);
    submit.mutate(parsed.data);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Report ${jobTitle}`}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <fieldset>
          <legend className="text-xs font-semibold">What is wrong?</legend>
          {REPORT_REASONS.map((option) => (
            <label key={option} className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="report-reason"
                checked={reason === option}
                onChange={() => setReason(option)}
              />
              {REASON_LABEL[option]}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="report-details" className="text-xs font-semibold">
            Details {reason === 'OTHER' ? '(required)' : '(optional)'}
          </label>
          <textarea
            id="report-details"
            rows={4}
            className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
        <p className="text-xs text-zinc-500">We will hide this job for you while we review it.</p>
        <FormMessage error={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Sending…' : 'Send report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
