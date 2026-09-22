import type {
  EvidenceProvenanceCategory,
  EvidenceSource,
  EvidenceType,
  EvidenceVerificationStatus,
  VerificationMetadata,
} from '@smart/contracts';

export interface RecordCategorizationInput {
  evidenceType: EvidenceType | string;
  source: EvidenceSource | string;
  verificationStatus?: EvidenceVerificationStatus | string | null;
  verificationMetadata?: VerificationMetadata | Record<string, unknown> | null;
  hasReviewerDecision?: boolean;
}

/**
 * Pure helper function to derive provenance categories for an EvidenceRecord.
 * Categories are NOT mutually exclusive — one record can belong to multiple categories.
 */
export function deriveEvidenceCategories(
  record: RecordCategorizationInput,
): EvidenceProvenanceCategory[] {
  const categories: EvidenceProvenanceCategory[] = [];
  const vm = (record.verificationMetadata ?? {}) as Record<string, unknown>;
  const verificationMethod =
    typeof vm.verificationMethod === 'string' ? vm.verificationMethod : null;
  const verifiedBy = typeof vm.verifiedBy === 'string' ? vm.verifiedBy.trim() : null;
  const status = record.verificationStatus ?? null;

  // 1. SELF_DECLARED
  if (
    record.evidenceType === 'SELF_REPORT' ||
    record.source === 'CANDIDATE' ||
    verificationMethod === 'SELF_ATTESTED'
  ) {
    categories.push('SELF_DECLARED');
  }

  // 2. SOURCE_VERIFIED
  if (
    status === 'VERIFIED' &&
    (record.source === 'EMPLOYER' ||
      record.source === 'ISSUER' ||
      verificationMethod === 'EMPLOYER' ||
      verificationMethod === 'ISSUER' ||
      verificationMethod === 'DOCUMENT')
  ) {
    categories.push('SOURCE_VERIFIED');
  }

  // 3. ASSESSED
  if (
    record.evidenceType === 'ASSESSMENT' ||
    record.evidenceType === 'INTERVIEW' ||
    verificationMethod === 'ASSESSMENT' ||
    verificationMethod === 'INTERVIEW'
  ) {
    categories.push('ASSESSED');
  }

  // 4. HUMAN_REVIEWED
  if (
    verificationMethod === 'HUMAN_REVIEW' ||
    verificationMethod === 'ARTIFACT_REVIEW' ||
    (verifiedBy !== null && verifiedBy.length > 0) ||
    record.hasReviewerDecision === true
  ) {
    categories.push('HUMAN_REVIEWED');
  }

  return categories;
}
