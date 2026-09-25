'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, MapPin } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { StudentApplicationCard } from '@smart/contracts';
import { Alert, ConfirmDialog, ErrorState, LoadingState, VerifiedBadge, cn } from '@smart/ui';
import { api } from '@/lib/api';
import { formatAppliedOn } from '@/lib/my-applications';
import { ApplicationStatusBar, ApplicationTimeline } from './ApplicationStatusTimeline';
import { ReviewCompanyDialog } from './ReviewCompanyDialog';

export const STUDENT_APPLICATIONS_KEY = ['student', 'applications'] as const;
export const studentApplicationKey = (id: string) => ['student', 'application', id] as const;

interface ApplicationsPanelProps {
  applications: StudentApplicationCard[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** My Applications (Th6-392/393): list and detail in student-facing wording, with withdraw. */
export function ApplicationsPanel({
  applications,
  isLoading,
  isError,
  onRetry,
}: ApplicationsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // One key per unchanged request, so a retry after a dropped connection can never withdraw twice.
  const keyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const selected = applications.find((row) => row.id === selectedId) ?? applications[0] ?? null;

  const detail = useQuery({
    queryKey: selected ? studentApplicationKey(selected.id) : ['student', 'application', 'none'],
    queryFn: () => api.studentApplications.detail((selected as StudentApplicationCard).id),
    enabled: selected !== null,
    retry: false,
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => {
      const body = reason.trim() ? { reason: reason.trim() } : {};
      const fingerprint = `${id}:${JSON.stringify(body)}`;
      if (keyRef.current?.fingerprint !== fingerprint) {
        keyRef.current = { fingerprint, key: crypto.randomUUID() };
      }
      return api.studentApplications.withdraw(id, body, keyRef.current.key);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(studentApplicationKey(updated.id), updated);
      setWithdrawOpen(false);
      setReason('');
      setNotice('Your application was withdrawn.');
      await queryClient.invalidateQueries({ queryKey: STUDENT_APPLICATIONS_KEY });
    },
  });

  if (isLoading) return <LoadingState message="Loading your applications…" />;
  if (isError) {
    return (
      <ErrorState
        title="Could not load your applications"
        message="Check your connection and try again."
        onRetry={onRetry}
      />
    );
  }
  if (applications.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
        <Briefcase className="mx-auto mb-2 size-8 text-zinc-400" aria-hidden />
        <p className="text-sm font-semibold">No applications yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
          When you apply to a job, or a campus partner shortlists you, it shows up here with its
          progress.
        </p>
        <Link
          href="/jobs"
          className="mt-4 inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800"
        >
          Browse jobs
        </Link>
      </div>
    );
  }

  const withdrawError = withdraw.isError
    ? isSmartApiError(withdraw.error) && withdraw.error.message
      ? withdraw.error.message
      : 'Could not withdraw. Please try again.'
    : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4" role="list" aria-label="My applications">
        {applications.map((app) => (
          <button
            key={app.id}
            type="button"
            role="listitem"
            onClick={() => {
              setSelectedId(app.id);
              setNotice(null);
            }}
            className={cn(
              'w-full rounded-md border p-4 text-left shadow-2xs transition-all',
              app.id === selected?.id
                ? 'border-zinc-900 bg-white ring-2 ring-zinc-900/10 dark:border-white dark:bg-[#1c1c1c]'
                : 'border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#161616]',
            )}
          >
            <p className="truncate text-xs font-bold">{app.roleTitle}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
              {app.companyName}
              <VerifiedBadge
                verified={app.companyVerified}
                verifiedAt={app.companyVerifiedAt}
                variant="icon"
              />
            </p>
            <div className="mt-3">
              <ApplicationStatusBar status={app.status} labels={false} />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-zinc-500">{app.statusLabel}</p>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="rounded-md border border-zinc-200/80 bg-white p-6 shadow-2xs lg:col-span-8 dark:border-zinc-800 dark:bg-[#161616]">
          {notice ? (
            <Alert tone="success" className="mb-4">
              {notice}
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-bold dark:bg-zinc-800">
              {selected.companyName}
            </span>
            <VerifiedBadge
              verified={selected.companyVerified}
              verifiedAt={selected.companyVerifiedAt}
            />
            {selected.location ? (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <MapPin className="size-3.5" aria-hidden /> {selected.location}
              </span>
            ) : null}
            <span className="text-xs text-zinc-400">
              Applied {formatAppliedOn(selected.appliedAt)}
            </span>
            {selected.companyId ? (
              <button
                type="button"
                className="ml-auto text-xs font-semibold text-blue-700 hover:underline"
                onClick={() => setReviewOpen(true)}
              >
                Review this company
              </button>
            ) : null}
          </div>
          {selected.companyId ? (
            <ReviewCompanyDialog
              open={reviewOpen}
              onClose={() => setReviewOpen(false)}
              companyId={selected.companyId}
              companyName={selected.companyName}
            />
          ) : null}

          <h2 className="mt-4 font-heading text-xl font-bold sm:text-2xl">{selected.roleTitle}</h2>
          <p className="mt-1 text-xs text-zinc-500">Reference {selected.referenceNumber}</p>
          <p className="mt-2 text-sm">
            Status: <strong data-testid="status-label">{selected.statusLabel}</strong>
          </p>

          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Progress
            </p>
            <ApplicationStatusBar status={selected.status} />
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              History
            </p>
            {detail.isPending ? (
              <LoadingState message="Loading history…" />
            ) : detail.isError ? (
              <ErrorState
                title="Could not load the history"
                message="Try again in a moment."
                onRetry={() => void detail.refetch()}
              />
            ) : (
              <>
                <ApplicationTimeline entries={detail.data.timeline} />
                {detail.data.coverNote ? (
                  <p className="mt-4 text-sm">
                    <span className="font-semibold">Your note: </span>
                    {detail.data.coverNote}
                  </p>
                ) : null}
                {detail.data.canWithdraw ? (
                  <button
                    type="button"
                    className="mt-5 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => {
                      withdraw.reset();
                      setWithdrawOpen(true);
                    }}
                  >
                    Withdraw application
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onConfirm={() => {
          if (selected) withdraw.mutate(selected.id);
        }}
        title="Withdraw this application?"
        variant="danger"
        confirmText="Withdraw"
        isLoading={withdraw.isPending}
        error={withdrawError}
        description={
          <div className="space-y-3">
            <p>The employer will be told you withdrew. You cannot undo this.</p>
            <label className="block text-xs font-semibold" htmlFor="withdraw-reason">
              Reason (optional)
            </label>
            <textarea
              id="withdraw-reason"
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-zinc-300 p-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        }
      />
    </div>
  );
}
