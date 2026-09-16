'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { SEND_TO_COMPANY_STAGE } from '@smart/contracts';
import type { ApplicationConfidenceDto, ApplicationDto, JobOpeningDto } from '@smart/contracts';
import { Alert, Button } from '@smart/ui';
import { applicationsApi, openingsApi } from '../lib/api';
import { stageBadgeClass } from '../lib/ats-stage-ui';
import {
  cardClass,
  cardCompactClass,
  labelClass,
  mutedTextClass,
  secondaryButtonClass,
  sectionLabelClass,
  selectClass,
} from '../lib/tpo-ui';
import { PlacementEmptyState } from './placement/PlacementEmptyState';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

type ReviewRow = {
  application: ApplicationDto;
  confidence: ApplicationConfidenceDto | null;
  confidenceError: string | null;
};

const openingSelectClass = `${selectClass} min-w-[240px]`;

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
        (application) =>
          application.stage === 'SHORTLISTED' || application.stage === SEND_TO_COMPANY_STAGE,
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
        message: `${updated.studentName ?? 'Candidate'} is now in the AI-Verified ATS column.`,
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
    <>
      <PlacementPageHeader
        eyebrow="Placement · Pipeline"
        title="Confidence review & send to company"
        description="Review the SE-T02 pass/fail result and explanation, then send a shortlisted candidate to the company ATS. No score is calculated here."
        actions={
          <>
            <label className={`flex items-center gap-2 ${labelClass}`}>
              <span>Job opening:</span>
              <select
                aria-label="Select Job Opening"
                className={openingSelectClass}
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
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                void loadOpenings();
                if (selectedOpeningId) void loadRows(selectedOpeningId);
              }}
              disabled={loadingOpenings || loadingRows}
            >
              Refresh
            </button>
          </>
        }
      />

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
        <div className={`${cardCompactClass} flex flex-wrap gap-x-8 gap-y-3`}>
          <div>
            <p className={sectionLabelClass}>Role</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">
              {selectedOpening.roleTitle}
            </p>
          </div>
          <div>
            <p className={sectionLabelClass}>Company</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">
              {selectedOpening.companyName}
            </p>
          </div>
        </div>
      ) : null}

      {loadingOpenings || loadingRows ? (
        <div role="status" className="flex flex-col gap-4">
          <p className={`text-sm ${mutedTextClass}`}>Loading shortlisted candidates…</p>
          {[1, 2].map((slot) => (
            <div key={slot} className={`${cardClass} h-36 animate-pulse`} />
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <PlacementEmptyState
          icon={ShieldCheck}
          title="Nothing to review"
          description="Select a job opening to review shortlisted candidates."
        />
      ) : rows.length === 0 ? (
        <PlacementEmptyState
          icon={ShieldCheck}
          title="Nothing to review"
          description="Shortlisted candidates requiring confidence review will appear here."
        />
      ) : (
        <section
          aria-label="Shortlisted candidates for confidence review"
          className="flex flex-col gap-4"
        >
          {rows.map(({ application, confidence, confidenceError }) => {
            const alreadySent = application.stage === SEND_TO_COMPANY_STAGE;
            const canSend = Boolean(confidence?.complete) && !alreadySent && !confidenceError;
            const resultLabel =
              confidence?.passed === true
                ? 'Passed'
                : confidence?.passed === false
                  ? 'Failed'
                  : 'Unavailable';

            return (
              <article
                key={application.applicationId}
                className={`${cardClass} flex flex-col gap-3`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--ds-text)]">
                      {application.studentName ?? 'Candidate'}
                    </h2>
                    <p className={`mt-0.5 text-xs ${mutedTextClass}`}>
                      {application.studentEmail ?? application.studentId}
                      {application.primaryTrackCode ? ` · ${application.primaryTrackCode}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={stageBadgeClass(application.stage)}>{application.stage}</span>
                    {alreadySent ? (
                      <span className="inline-flex items-center rounded-full border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--ds-text)]">
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
                  <p className={`text-sm ${mutedTextClass}`}>Loading confidence result…</p>
                ) : (
                  <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-3">
                    <p className={`mb-1 ${sectionLabelClass}`}>SE-T02 confidence result</p>
                    <p className="text-sm font-semibold text-[var(--ds-text)]">{resultLabel}</p>
                    {confidence.explanation ? (
                      <p className="mt-1 text-sm text-[var(--ds-text)]">{confidence.explanation}</p>
                    ) : (
                      <p className={`mt-1 text-sm ${mutedTextClass}`}>
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
                    <p className={`text-xs ${mutedTextClass}`}>
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
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
