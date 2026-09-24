import { describe, expect, it } from 'vitest';
import { deriveEvidenceCategories } from './evidence-provenance.helper.js';

describe('deriveEvidenceCategories (VER-01)', () => {
  it('categorizes SELF_REPORT as SELF_DECLARED', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'SELF_REPORT',
      source: 'CANDIDATE',
    });
    expect(result).toEqual(['SELF_DECLARED']);
  });

  it('categorizes VERIFIED credential from ISSUER as SOURCE_VERIFIED', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'CREDENTIAL',
      source: 'ISSUER',
      verificationStatus: 'VERIFIED',
    });
    expect(result).toEqual(['SOURCE_VERIFIED']);
  });

  it('does not categorize PENDING credential from ISSUER as SOURCE_VERIFIED', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'CREDENTIAL',
      source: 'ISSUER',
      verificationStatus: 'PENDING',
    });
    expect(result).toEqual([]);
  });

  it('categorizes ASSESSMENT as ASSESSED', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'ASSESSMENT',
      source: 'PLATFORM',
    });
    expect(result).toEqual(['ASSESSED']);
  });

  it('categorizes HUMAN_REVIEW method as HUMAN_REVIEWED', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'PROJECT_SKILL_MAPPING',
      source: 'CANDIDATE',
      verificationMetadata: { verificationMethod: 'HUMAN_REVIEW', verifiedBy: 'usr-admin' },
    });
    expect(result).toContain('SELF_DECLARED');
    expect(result).toContain('HUMAN_REVIEWED');
  });

  it('categorizes record with reviewer decision as HUMAN_REVIEWED', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'WORK_EXPERIENCE',
      source: 'EMPLOYER',
      verificationStatus: 'VERIFIED',
      hasReviewerDecision: true,
    });
    expect(result).toContain('SOURCE_VERIFIED');
    expect(result).toContain('HUMAN_REVIEWED');
  });

  it('handles multiple categories for a single evidence record', () => {
    const result = deriveEvidenceCategories({
      evidenceType: 'ASSESSMENT',
      source: 'ISSUER',
      verificationStatus: 'VERIFIED',
      verificationMetadata: { verificationMethod: 'ASSESSMENT', verifiedBy: 'evaluator' },
      hasReviewerDecision: true,
    });
    expect(result).toEqual(['SOURCE_VERIFIED', 'ASSESSED', 'HUMAN_REVIEWED']);
  });
});
