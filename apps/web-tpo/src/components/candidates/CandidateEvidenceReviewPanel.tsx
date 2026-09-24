'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type {
  CandidateEvidenceProvenanceResponse,
  EvidenceProvenanceItemDto,
  EvidenceReviewDecision,
  ReviewEvidenceResponse,
} from '@smart/contracts';
import { api } from '../../lib/api';
import {
  bentoCompactCardClass,
  bentoChipClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
} from '../../lib/tpo-dashboard-ui';

type ReviewUiState = 'idle' | 'submitting' | 'processing' | 'success' | 'failure';

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function CandidateEvidenceReviewPanel({ studentId }: { studentId: string }) {
  const [provenance, setProvenance] = useState<CandidateEvidenceProvenanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [decision, setDecision] = useState<EvidenceReviewDecision>('ACCEPTED');
  const [reason, setReason] = useState('');
  const [requestedInformation, setRequestedInformation] = useState('');
  const [uiState, setUiState] = useState<ReviewUiState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ReviewEvidenceResponse | null>(null);

  const loadProvenance = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await api.placement.getCandidateEvidenceProvenance(studentId);
      setProvenance(result);
      setSelectedEvidenceId((current) => current ?? result.items[0]?.evidenceId ?? null);
    } catch (caught: unknown) {
      setLoadError(isSmartApiError(caught) ? caught.message : 'Could not load candidate evidence.');
      setProvenance(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadProvenance();
  }, [loadProvenance]);

  const selectedItem: EvidenceProvenanceItemDto | undefined = provenance?.items.find(
    (item) => item.evidenceId === selectedEvidenceId,
  );

  async function submitReview(retry = false) {
    if (!selectedEvidenceId) return;
    setSubmitError(null);
    setUiState(retry ? 'processing' : 'submitting');
    try {
      const body =
        decision === 'NEEDS_INFORMATION'
          ? {
              decision,
              reason: reason.trim() || undefined,
              requestedInformation: requestedInformation.trim() || undefined,
            }
          : decision === 'REJECTED'
            ? { decision, reason: reason.trim() }
            : { decision, reason: reason.trim() || undefined };

      const response = await api.placement.reviewCandidateEvidence(
        studentId,
        selectedEvidenceId,
        body,
      );
      setLastResponse(response);
      setUiState(response.reconciliation.status === 'QUEUED' ? 'processing' : 'success');
      await loadProvenance();
      if (response.reconciliation.status === 'QUEUED') {
        setUiState('success');
      }
    } catch (caught: unknown) {
      setUiState('failure');
      setSubmitError(
        isSmartApiError(caught)
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : 'Review submission failed.',
      );
    }
  }

  if (loading) {
    return (
      <div
        className={`${bentoCompactCardClass} flex items-center gap-2 text-sm text-[var(--ds-text-muted)]`}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading evidence…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${bentoCompactCardClass} space-y-3`}>
        <p className="text-sm text-[var(--ds-danger)]">{loadError}</p>
        <button type="button" className={bentoChipClass} onClick={() => void loadProvenance()}>
          Retry
        </button>
      </div>
    );
  }

  if (!provenance || provenance.total === 0) {
    return (
      <div className={`${bentoCompactCardClass} text-sm text-[var(--ds-text-muted)]`}>
        No evidence records to review for this candidate.
      </div>
    );
  }

  return (
    <div className={`${bentoCompactCardClass} space-y-4`} data-testid="evidence-review-panel">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">Evidence review</h3>
        <p className="mt-1 text-[13px] text-[var(--ds-text-muted)]">
          Mark evidence as accepted, rejected, or requiring more information.
        </p>
      </div>

      <label className="block text-[13px] font-medium text-[var(--ds-text-secondary)]">
        Evidence item
        <select
          className="mt-1 w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm"
          value={selectedEvidenceId ?? ''}
          onChange={(event) => setSelectedEvidenceId(event.target.value)}
          data-testid="evidence-select"
        >
          {provenance.items.map((item) => (
            <option key={item.evidenceId} value={item.evidenceId}>
              {item.claim ?? item.evidenceType} — {statusLabel(item.verificationStatus)}
            </option>
          ))}
        </select>
      </label>

      {selectedItem ? (
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--ds-text)]">
              {selectedItem.claim ?? selectedItem.evidenceType}
            </span>
            <span className={dashboardPendingBadgeClass}>{selectedItem.verificationStatus}</span>
          </div>
          {selectedItem.context ? (
            <p className="mt-2 text-[var(--ds-text-muted)]">{selectedItem.context}</p>
          ) : null}
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium text-[var(--ds-text-secondary)]">
          Decision
        </legend>
        {(['ACCEPTED', 'REJECTED', 'NEEDS_INFORMATION'] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="evidence-review-decision"
              value={value}
              checked={decision === value}
              onChange={() => setDecision(value)}
              data-testid={`decision-${value}`}
            />
            {statusLabel(value)}
          </label>
        ))}
      </fieldset>

      {(decision === 'REJECTED' || decision === 'NEEDS_INFORMATION' || reason.trim()) && (
        <label className="block text-[13px] font-medium text-[var(--ds-text-secondary)]">
          Reason / comment
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            data-testid="review-reason"
          />
        </label>
      )}

      {decision === 'NEEDS_INFORMATION' ? (
        <label className="block text-[13px] font-medium text-[var(--ds-text-secondary)]">
          Requested information
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm"
            value={requestedInformation}
            onChange={(event) => setRequestedInformation(event.target.value)}
            data-testid="requested-information"
          />
        </label>
      ) : null}

      {submitError ? (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--ds-danger-border)] bg-[var(--ds-danger-surface)] p-3 text-sm text-[var(--ds-danger)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-2">
            <p>{submitError}</p>
            <button
              type="button"
              className={bentoChipClass}
              onClick={() => void submitReview(true)}
              data-testid="review-retry"
            >
              <RefreshCw className="mr-1 inline size-3.5" aria-hidden />
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {uiState === 'submitting' || uiState === 'processing' ? (
        <p
          className="flex items-center gap-2 text-sm text-[var(--ds-text-muted)]"
          data-testid="review-processing"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {uiState === 'submitting'
            ? 'Submitting review…'
            : 'Processing downstream reconciliation…'}
        </p>
      ) : null}

      {uiState === 'success' && lastResponse ? (
        <p
          className={`flex items-center gap-2 text-sm ${dashboardMintBadgeClass}`}
          data-testid="review-success"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Saved — status is now {lastResponse.evidence.verificationStatus}
          {lastResponse.idempotent ? ' (no change)' : ''}.
        </p>
      ) : null}

      <button
        type="button"
        className={bentoChipClass}
        disabled={!selectedEvidenceId || uiState === 'submitting'}
        onClick={() => void submitReview()}
        data-testid="submit-review"
      >
        Submit review
      </button>
    </div>
  );
}
