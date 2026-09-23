import type { EvidenceReviewDecision, EvidenceVerificationStatus } from '@smart/contracts';

export const REVIEW_AUDIT_ACTIONS: Record<EvidenceReviewDecision, string> = {
  ACCEPTED: 'EVIDENCE_REVIEW_ACCEPTED',
  REJECTED: 'EVIDENCE_REVIEW_REJECTED',
  NEEDS_INFORMATION: 'EVIDENCE_REVIEW_NEEDS_INFORMATION',
};

export const REVIEW_AUDIT_ACTION_VALUES = new Set<string>(Object.values(REVIEW_AUDIT_ACTIONS));

export function isReviewAuditAction(
  action: unknown,
): action is (typeof REVIEW_AUDIT_ACTIONS)[EvidenceReviewDecision] {
  return typeof action === 'string' && REVIEW_AUDIT_ACTION_VALUES.has(action);
}

export function findLatestReviewAuditEntry(
  metadata: Record<string, unknown> | null | undefined,
): { action: string; actorId?: string | null; at?: string; note?: string } | null {
  const auditTrail = Array.isArray(metadata?.auditTrail) ? metadata.auditTrail : [];
  for (let index = auditTrail.length - 1; index >= 0; index -= 1) {
    const entry = auditTrail[index];
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const action = (entry as { action?: string }).action;
    if (!isReviewAuditAction(action)) {
      continue;
    }
    return entry as { action: string; actorId?: string | null; at?: string; note?: string };
  }
  return null;
}

export function mapReviewDecisionToVerificationStatus(
  decision: EvidenceReviewDecision,
): EvidenceVerificationStatus {
  switch (decision) {
    case 'ACCEPTED':
      return 'VERIFIED';
    case 'REJECTED':
      return 'REJECTED';
    case 'NEEDS_INFORMATION':
      return 'PENDING';
  }
}

export function reviewBlocksTerminalStatus(currentStatus: EvidenceVerificationStatus): boolean {
  return currentStatus === 'EXPIRED';
}

export function reviewDecisionConflict(
  currentStatus: EvidenceVerificationStatus,
  decision: EvidenceReviewDecision,
): boolean {
  return currentStatus === 'REJECTED' && decision === 'ACCEPTED';
}

export function formatReviewAuditNote(
  decision: EvidenceReviewDecision,
  reason?: string,
  requestedInformation?: string,
): string | undefined {
  const parts: string[] = [];
  if (reason?.trim()) {
    parts.push(reason.trim());
  }
  if (decision === 'NEEDS_INFORMATION' && requestedInformation?.trim()) {
    parts.push(`Requested: ${requestedInformation.trim()}`);
  }
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

export function isIdempotentReviewRequest(
  currentStatus: EvidenceVerificationStatus,
  metadata: Record<string, unknown> | null | undefined,
  decision: EvidenceReviewDecision,
  reviewerId: string,
): boolean {
  const targetStatus = mapReviewDecisionToVerificationStatus(decision);
  if (currentStatus !== targetStatus) {
    return false;
  }

  if (decision === 'NEEDS_INFORMATION' && metadata?.reviewRequired !== true) {
    return false;
  }

  const latestReview = findLatestReviewAuditEntry(metadata);
  if (!latestReview) {
    return false;
  }

  return (
    latestReview.action === REVIEW_AUDIT_ACTIONS[decision] && latestReview.actorId === reviewerId
  );
}

export function mergeReviewVerificationMetadata(
  existing: Record<string, unknown> | null | undefined,
  params: {
    decision: EvidenceReviewDecision;
    reviewerId: string;
    reviewerDisplay: string;
    reason?: string;
    requestedInformation?: string;
    nowIso: string;
  },
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };
  const auditTrail = Array.isArray(base.auditTrail) ? [...base.auditTrail] : [];
  auditTrail.push({
    at: params.nowIso,
    actorId: params.reviewerId,
    action: REVIEW_AUDIT_ACTIONS[params.decision],
    note: formatReviewAuditNote(params.decision, params.reason, params.requestedInformation),
  });

  const merged: Record<string, unknown> = {
    ...base,
    auditTrail,
    verificationMethod: base.verificationMethod ?? 'HUMAN_REVIEW',
  };

  if (params.decision === 'NEEDS_INFORMATION') {
    merged.reviewRequired = true;
  } else if (params.decision === 'ACCEPTED') {
    merged.reviewRequired = false;
    merged.verifiedBy = params.reviewerDisplay;
    merged.verificationDate = params.nowIso;
  } else {
    merged.reviewRequired = false;
  }

  return merged;
}
