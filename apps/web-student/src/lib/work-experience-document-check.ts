import { isInvalidEmploymentProofAttachmentType } from '@smart/contracts';
import type { WorkExperienceDocumentDto } from '@smart/contracts';

export type WorkExperienceDocumentCheckSummary = {
  text: string;
  tag: string;
  styleClass: string;
};

type ValidationSnapshot = {
  validationStatus?: string;
};

function legacyValidationStatus(
  doc: WorkExperienceDocumentDto,
  validationResults: Record<string, ValidationSnapshot>,
): string | undefined {
  return (
    validationResults[doc.id]?.validationStatus ??
    (doc as unknown as { validationStatus?: string }).validationStatus
  );
}

function requiresEmploymentProofCheck(documentType: string): boolean {
  return !isInvalidEmploymentProofAttachmentType(documentType);
}

/**
 * Stage 2 tracker copy — offer letters are supporting docs only (no OCR validate button).
 * Relieving / experience letters use authenticityStatus or legacy proof validation.
 */
export function summarizeWorkExperienceDocumentCheck(params: {
  documents: WorkExperienceDocumentDto[];
  validationResults: Record<string, ValidationSnapshot>;
}): WorkExperienceDocumentCheckSummary {
  const docs = params.documents;
  if (docs.length === 0) {
    return {
      text: 'No Proof Uploaded',
      tag: 'Missing',
      styleClass: 'bg-muted text-muted-foreground',
    };
  }

  const proofDocs = docs.filter((doc) => requiresEmploymentProofCheck(doc.documentType));
  const supportingOnly = proofDocs.length === 0;

  if (supportingOnly) {
    return {
      text: 'Supporting docs on file',
      tag: 'Complete',
      styleClass: 'bg-muted text-foreground',
    };
  }

  const hasLegacyValidated = proofDocs.some(
    (doc) => legacyValidationStatus(doc, params.validationResults) === 'VALIDATED',
  );
  const hasLegacyReview = proofDocs.some(
    (doc) => legacyValidationStatus(doc, params.validationResults) === 'NEEDS_MANUAL_REVIEW',
  );
  const hasLegacyRejected = proofDocs.some(
    (doc) => legacyValidationStatus(doc, params.validationResults) === 'REJECTED',
  );

  const hasAuthenticityOk = proofDocs.some((doc) => doc.authenticityStatus === 'doc_ok');
  const hasAuthenticityFlagged = proofDocs.some((doc) => doc.authenticityStatus === 'doc_flagged');

  if (hasLegacyValidated || hasAuthenticityOk) {
    return {
      text: 'Validated (AI Check)',
      tag: 'Complete',
      styleClass: 'bg-muted text-foreground',
    };
  }
  if (hasLegacyReview || hasAuthenticityFlagged) {
    return {
      text: 'Needs Manual Review',
      tag: 'Review Flagged',
      styleClass: 'bg-amber-50 text-amber-900',
    };
  }
  if (hasLegacyRejected) {
    return {
      text: 'Document Rejected',
      tag: 'Rejected',
      styleClass: 'bg-red-50 text-red-700',
    };
  }

  const awaitingValidation = proofDocs.some(
    (doc) => doc.authenticityStatus === 'pending' || doc.authenticityStatus === undefined,
  );

  if (awaitingValidation) {
    return {
      text: 'Use “Validate Proof” on employment letters',
      tag: 'Action needed',
      styleClass: 'bg-blue-50 text-blue-700',
    };
  }

  return {
    text: 'Document check in progress',
    tag: 'Pending',
    styleClass: 'bg-blue-50 text-blue-700',
  };
}
