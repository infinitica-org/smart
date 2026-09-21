'use client';

import { use, useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { proficiencyLevelUiLabel, type GetCertificateEndorsementResponse } from '@smart/contracts';
import { api } from '@/lib/api';

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}
const ICON_PATH = {
  checkCircle: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  alert:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

const PROFICIENCY_LABELS: Record<string, string> = {
  BEGINNER: proficiencyLevelUiLabel('BEGINNER'),
  INTERMEDIATE: proficiencyLevelUiLabel('INTERMEDIATE'),
  ADVANCED: proficiencyLevelUiLabel('ADVANCED'),
  PROFESSIONAL: proficiencyLevelUiLabel('PROFESSIONAL'),
  EXPERT: 'Expert',
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function CertificateEndorsementPage({ params }: PageProps) {
  const { token } = use(params);

  const [data, setData] = useState<GetCertificateEndorsementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.candidateCertificates
      .getEndorsement(token)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          isSmartApiError(err) && err.statusCode === 404
            ? 'This endorsement link is invalid.'
            : 'Could not load this endorsement request right now.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleDecision = async (approved: boolean) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.candidateCertificates.submitEndorsementDecision(token, {
        approved,
        comments: comments.trim() || undefined,
      });
      setSubmittedStatus(result.status === 'APPROVED' ? 'APPROVED' : 'REJECTED');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit your decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[var(--text-muted)]">
        <Icon path={ICON_PATH.clock} className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-24 text-center">
        <Icon path={ICON_PATH.alert} className="h-10 w-10 text-[var(--text-muted)]" />
        <h1 className="text-lg font-semibold">{loadError ?? 'Something went wrong'}</h1>
      </div>
    );
  }

  const alreadyDone = submittedStatus !== null || data.isAlreadyResponded;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Certificate Endorsement Request
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {data.candidateName} has asked you to review and endorse this certificate.
        </p>

        {submittedStatus ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
            <Icon path={ICON_PATH.checkCircle} className="h-5 w-5 shrink-0" />
            {submittedStatus === 'APPROVED'
              ? 'Thank you — your endorsement has been recorded.'
              : 'Your decision has been recorded.'}
          </div>
        ) : data.isExpired ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            <Icon path={ICON_PATH.alert} className="h-5 w-5 shrink-0" />
            This endorsement link has expired.
          </div>
        ) : data.isAlreadyResponded ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-info/30 bg-info/10 p-4 text-sm text-info">
            <Icon path={ICON_PATH.clock} className="h-5 w-5 shrink-0" />
            This endorsement was already responded to (status: {data.status}).
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Certificate
            </span>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {data.certificateTitle}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Issued by
            </span>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {data.certificateIssuer}
            </p>
          </div>
        </div>

        {data.certificateFileUrl ? (
          <a
            href={data.certificateFileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm text-[#00967c] underline dark:text-[#14b8a6]"
          >
            View the certificate file
          </a>
        ) : null}

        <div className="mt-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Claimed skills
          </span>
          {data.skills.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">None listed.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span
                  key={skill.skillName}
                  className="rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-primary)]"
                >
                  {skill.skillName} · {PROFICIENCY_LABELS[skill.selfAssessedProficiency]}
                </span>
              ))}
            </div>
          )}
        </div>

        {data.learningDescription ? (
          <div className="mt-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              What they learned
            </span>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-primary)]">
              {data.learningDescription}
            </p>
          </div>
        ) : null}

        {data.practicalApplied && data.practicalDescription ? (
          <div className="mt-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Practical application
            </span>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-primary)]">
              {data.practicalDescription}
            </p>
          </div>
        ) : null}

        {!alreadyDone && !data.isExpired ? (
          <div className="mt-8 flex flex-col gap-4 border-t border-[var(--surface-border)] pt-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your decision</h2>
            <textarea
              rows={3}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Optional comments…"
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDecision(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14b8a6] px-4 py-3 text-sm font-semibold text-black hover:bg-[#0d9488] disabled:opacity-50 sm:w-1/2"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDecision(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger/20 disabled:opacity-50 sm:w-1/2"
              >
                Reject
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
