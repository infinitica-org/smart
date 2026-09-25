'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { COVER_NOTE_MAX_LENGTH, type ApplyToJobResponse } from '@smart/contracts';
import { Button, ErrorState, FormMessage, LoadingState, Modal } from '@smart/ui';
import { api } from '@/lib/api';
import { formatAppliedOn } from '@/lib/my-applications';
import { STUDENT_JOBS_KEY } from '../jobs/job-cache';
import { STUDENT_APPLICATIONS_KEY } from './ApplicationsPanel';

interface ApplyJobDialogProps {
  open: boolean;
  jobId: string;
  onClose: () => void;
}

const BAND_LABEL = { STRONG: 'Strong fit', MODERATE: 'Good fit', STRETCH: 'Stretch' } as const;

/**
 * Apply with my verified SMART profile (Th6-387/388/389).
 * Step 1: see exactly what the employer will see and confirm you reviewed it.
 * Step 2: optional cover note, then submit. Then a confirmation with a reference number.
 */
export function ApplyJobDialog({ open, jobId, onClose }: ApplyJobDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [reviewed, setReviewed] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState<ApplyToJobResponse | null>(null);
  // Same payload => same key, so retrying after a dropped connection can never apply twice.
  const keyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const preview = useQuery({
    queryKey: ['student', 'application-preview', jobId],
    queryFn: () => api.studentApplications.preview(jobId),
    enabled: open,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () => {
      const body = {
        reviewedPreview: true as const,
        ...(coverNote.trim() ? { coverNote: coverNote.trim() } : {}),
      };
      const fingerprint = JSON.stringify(body);
      if (keyRef.current?.fingerprint !== fingerprint) {
        keyRef.current = { fingerprint, key: crypto.randomUUID() };
      }
      return api.studentApplications.apply(jobId, body, keyRef.current.key);
    },
    onSuccess: async (result) => {
      setDone(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: STUDENT_JOBS_KEY }),
        queryClient.invalidateQueries({ queryKey: STUDENT_APPLICATIONS_KEY }),
      ]);
    },
    onError: (err) => {
      const field = isSmartApiError(err) ? err.details[0]?.message : undefined;
      setError(
        field ??
          (isSmartApiError(err) && err.message
            ? err.message
            : 'Could not submit your application.'),
      );
    },
  });

  const data = preview.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? 'Application submitted' : 'Apply to this job'}
      size="lg"
    >
      {done ? (
        <div className="space-y-4" role="status">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="size-5" aria-hidden />
            <p className="font-semibold">
              {done.alreadyApplied ? 'You already applied to this job.' : 'Your application is in.'}
            </p>
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt className="text-zinc-500">Job</dt>
            <dd className="font-semibold">{done.roleTitle}</dd>
            <dt className="text-zinc-500">Company</dt>
            <dd>{done.companyName}</dd>
            <dt className="text-zinc-500">Applied on</dt>
            <dd>{formatAppliedOn(done.appliedAt)}</dd>
            <dt className="text-zinc-500">Reference</dt>
            <dd className="font-mono" data-testid="reference-number">
              {done.referenceNumber}
            </dd>
          </dl>
          <div>
            <p className="text-sm font-semibold">What happens next</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              <li>The employer reviews the verified profile you shared.</li>
              <li>You will get an in-app notice and an email each time your status changes.</li>
              <li>You can withdraw any time before you are hired or not selected.</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Link
              href="/applications"
              className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white"
            >
              View my application
            </Link>
          </div>
        </div>
      ) : preview.isPending ? (
        <LoadingState message="Preparing what the employer will see…" />
      ) : preview.isError || !data ? (
        <ErrorState
          title="Could not prepare your application"
          message={
            isSmartApiError(preview.error) && preview.error.statusCode === 409
              ? 'This job is no longer accepting applications.'
              : 'Check your connection and try again.'
          }
          onRetry={() => void preview.refetch()}
        />
      ) : step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            <strong>Step 1 of 2.</strong> This is exactly what {data.companyName} will see about
            you.
          </p>
          <section
            aria-label="What the employer will see"
            className="space-y-3 rounded-lg border p-4 text-sm"
          >
            <p className="text-base font-bold">{data.profile.fullName}</p>
            {data.profile.trackName ? (
              <p className="text-zinc-500">{data.profile.trackName}</p>
            ) : null}
            {data.fit ? (
              <p className="font-semibold">
                {BAND_LABEL[data.fit.band]} · {data.fit.matchPercent}% match for {data.roleTitle}
              </p>
            ) : null}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                Verified skills
              </p>
              {data.profile.skills.length === 0 ? (
                <p className="text-zinc-500">No verified skills yet.</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {data.profile.skills.map((skill) => (
                    <li key={skill.skillCode} className="rounded-full border px-2.5 py-0.5 text-xs">
                      {skill.skillName} ·{' '}
                      {skill.proficiency.charAt(0) + skill.proficiency.slice(1).toLowerCase()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-zinc-600">
              {data.profile.projects.length} project(s) · {data.profile.workExperience.length}{' '}
              verified work experience(s) · {data.profile.education.length} education record(s)
            </p>
          </section>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I&apos;ve reviewed what this employer will see
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!reviewed || data.alreadyApplied} onClick={() => setStep(2)}>
              {data.alreadyApplied ? 'Already applied' : 'Continue'}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(undefined);
            submit.mutate();
          }}
        >
          <p className="text-sm text-zinc-600">
            <strong>Step 2 of 2.</strong> Add a short note for {data.companyName} (optional).
          </p>
          <div>
            <label htmlFor="cover-note" className="text-xs font-semibold">
              Cover note
            </label>
            <textarea
              id="cover-note"
              rows={5}
              maxLength={COVER_NOTE_MAX_LENGTH}
              className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
            />
            <p className="text-right text-xs text-zinc-500">
              {coverNote.length}/{COVER_NOTE_MAX_LENGTH}
            </p>
          </div>
          <FormMessage error={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
