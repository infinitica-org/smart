'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { ApplicationConfidenceDto, ApplicationDto, JobOpeningDto } from '@smart/contracts';
import { Alert, Button, Card } from '@smart/ui';
import { applicationsApi, openingsApi } from '../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

type ReviewRow = {
  application: ApplicationDto;
  confidence: ApplicationConfidenceDto | null;
  confidenceError: string | null;
};

export function ConfidenceReviewWorkspace() {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'danger' | 'info';
    title: string;
    message: string;
  } | null>(null);

  async function loadOpenings() {
    setLoadingOpenings(true);
    setError(null);
    try {
      const res = await openingsApi.list();
      setOpenings(res.openings);
      if (res.openings.length > 0 && !selectedOpeningId) {
        setSelectedOpeningId(res.openings[0]?.openingId ?? '');
      }
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load job openings.'));
    } finally {
      setLoadingOpenings(false);
    }
  }

  async function loadRows(openingId: string) {
    if (!openingId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    setError(null);
    try {
      const listed = await applicationsApi.listForOpening(openingId);
      const reviewable = listed.applications.filter(
        (application) => application.stage === 'SHORTLISTED' || application.stage === 'INTERVIEW',
      );
      const next = await Promise.all(
        reviewable.map(async (application) => {
          try {
            const confidence = await applicationsApi.getConfidence(application.applicationId);
            return { application, confidence, confidenceError: null };
          } catch (caught) {
            return {
              application,
              confidence: null,
              confidenceError: errorMessage(caught, 'Could not load the confidence result.'),
            };
          }
        }),
      );
      setRows(next);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load shortlisted candidates.'));
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void loadOpenings();
  }, []);

  useEffect(() => {
    setNotice(null);
    if (selectedOpeningId) void loadRows(selectedOpeningId);
  }, [selectedOpeningId]);

  const selectedOpening = openings.find((opening) => opening.openingId === selectedOpeningId);

  async function sendToCompany(applicationId: string) {
    setSendingId(applicationId);
    setNotice(null);
    setError(null);
    try {
      const updated = await applicationsApi.sendToCompany(applicationId);
      setRows((current) =>
        current.map((row) =>
          row.application.applicationId === applicationId ? { ...row, application: updated } : row,
        ),
      );
      setNotice({
        tone: 'success',
        title: 'Sent to company',
        message: `${updated.studentName ?? 'Candidate'} is now in the Interviewing ATS column.`,
      });
    } catch (caught) {
      setNotice({
        tone: 'danger',
        title: 'Could not send to company',
        message: errorMessage(caught, 'Send to company failed.'),
      });
    } finally {
      setSendingId(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            TPO Concierge · AC-T06
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Confidence review & send to company
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Review the SE-T02 pass/fail result and explanation, then send a shortlisted candidate to
            the company ATS. No score is calculated here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Job opening:</span>
            <select
              aria-label="Select Job Opening"
              className="h-10 min-w-[240px] rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 text-sm font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedOpeningId}
              onChange={(event) => setSelectedOpeningId(event.target.value)}
              disabled={loadingOpenings || openings.length === 0}
            >
              {openings.length === 0 ? (
                <option value="">No openings found</option>
              ) : (
                openings.map((opening) => (
                  <option key={opening.openingId} value={opening.openingId}>
                    {opening.roleTitle} ({opening.companyName})
                  </option>
                ))
              )}
            </select>
          </label>
          <Button
            variant="outline"
            onClick={() => {
              void loadOpenings();
              if (selectedOpeningId) void loadRows(selectedOpeningId);
            }}
            disabled={loadingOpenings || loadingRows}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <Alert tone="danger" title="Review workspace error">
          {error}
        </Alert>
      ) : null}

      {notice ? (
        <Alert tone={notice.tone} title={notice.title}>
          {notice.message}
        </Alert>
      ) : null}

      {selectedOpening ? (
        <div className="flex flex-wrap gap-6 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)]">
          <div>
            <span className="font-semibold text-[var(--text)]">Role:</span>{' '}
            {selectedOpening.roleTitle}
          </div>
          <div>
            <span className="font-semibold text-[var(--text)]">Company:</span>{' '}
            {selectedOpening.companyName}
          </div>
        </div>
      ) : null}

      {loadingOpenings || loadingRows ? (
        <div role="status" className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">Loading shortlisted candidates…</p>
          {[1, 2].map((slot) => (
            <div
              key={slot}
              className="h-36 animate-pulse rounded-xl border border-[var(--surface-border)] bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-8 text-center text-sm text-[var(--text-muted)]">
          Select a job opening to review shortlisted candidates.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-8 text-center text-sm text-[var(--text-muted)]">
          No shortlisted or sent candidates for this opening.
        </p>
      ) : (
        <section
          aria-label="Shortlisted candidates for confidence review"
          className="flex flex-col gap-4"
        >
          {rows.map(({ application, confidence, confidenceError }) => {
            const alreadySent = application.stage === 'INTERVIEW';
            const canSend = Boolean(confidence?.complete) && !alreadySent && !confidenceError;
            const resultLabel =
              confidence?.passed === true
                ? 'Passed'
                : confidence?.passed === false
                  ? 'Failed'
                  : 'Unavailable';

            return (
              <Card
                key={application.applicationId}
                className="flex flex-col gap-3 border border-[var(--surface-border)] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text)]">
                      {application.studentName ?? 'Candidate'}
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {application.studentEmail ?? application.studentId}
                      {application.primaryTrackCode ? ` · ${application.primaryTrackCode}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--surface-border)] px-2.5 py-1 text-xs font-semibold">
                      {application.stage}
                    </span>
                    {alreadySent ? (
                      <span className="rounded-full border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
                        Sent to company
                      </span>
                    ) : null}
                  </div>
                </div>

                {confidenceError ? (
                  <Alert tone="danger" title="Could not load confidence result">
                    {confidenceError}
                  </Alert>
                ) : !confidence ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading confidence result…</p>
                ) : (
                  <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-subtle)] p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">
                      SE-T02 confidence result
                    </p>
                    <p className="text-sm font-semibold text-[var(--text)]">{resultLabel}</p>
                    {confidence.explanation ? (
                      <p className="mt-1 text-sm text-[var(--text)]">{confidence.explanation}</p>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {confidence.sendBlockedReason ?? 'No explanation is on file.'}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {!canSend &&
                  !alreadySent &&
                  !confidenceError &&
                  !confidence?.sendBlockedReason ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      A complete SE-T02 result is required before sending.
                    </p>
                  ) : (
                    <span />
                  )}
                  <Button
                    onClick={() => void sendToCompany(application.applicationId)}
                    disabled={!canSend || sendingId === application.applicationId}
                    aria-label={`Send ${application.studentName ?? 'candidate'} to company`}
                  >
                    {sendingId === application.applicationId
                      ? 'Sending…'
                      : alreadySent
                        ? 'Already sent'
                        : 'Send to Company'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
