import { describe, expect, it } from 'vitest';
import {
  isInvalidEmploymentProofAttachmentType,
  isInvalidEmploymentProofClassification,
  isDisallowedEndorserEmailDomain,
  deriveWorkExperienceNextAction,
} from '@smart/contracts';

describe('Epic WORK-EX-01 (S6-VB-01) — Work Experience Verification Specs', () => {
  describe('WE-T01: Company Metadata Capture & Domain Rules', () => {
    it('disallows endorser email on public free domains', () => {
      expect(isDisallowedEndorserEmailDomain('verifier@gmail.com')).toBe(true);
      expect(isDisallowedEndorserEmailDomain('verifier@yahoo.com')).toBe(true);
      expect(isDisallowedEndorserEmailDomain('verifier@techcorp.com')).toBe(false);
    });
  });

  describe('WE-T02: Document Proof Classification & Offer Letter Rejection', () => {
    it('identifies offer, joining, or appointment letters as invalid document types', () => {
      expect(isInvalidEmploymentProofAttachmentType('OFFER_LETTER')).toBe(true);
      expect(isInvalidEmploymentProofAttachmentType('JOINING_LETTER')).toBe(true);
      expect(isInvalidEmploymentProofAttachmentType('APPOINTMENT_LETTER')).toBe(true);
      expect(isInvalidEmploymentProofAttachmentType('EXPERIENCE_LETTER')).toBe(false);
      expect(isInvalidEmploymentProofAttachmentType('RELIEVING_LETTER')).toBe(false);
      expect(isInvalidEmploymentProofAttachmentType('SERVICE_CERTIFICATE')).toBe(false);
    });

    it('flags offer-letter OCR classifications as invalid proof', () => {
      expect(
        isInvalidEmploymentProofClassification({
          documentType: 'OFFER_LETTER',
          isActualEmploymentProof: true,
        }),
      ).toBe(true);
      expect(
        isInvalidEmploymentProofClassification({
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
        }),
      ).toBe(false);
    });
  });

  describe('WE-T03 & WE-T04: Lifecycle State Machine & Expiry Next Actions', () => {
    it('derives correct next action for candidates when verification is pending or expired', () => {
      expect(
        deriveWorkExperienceNextAction({
          status: 'UNVERIFIED',
          documentsCount: 0,
        }),
      ).toContain('upload');

      expect(
        deriveWorkExperienceNextAction({
          status: 'EXPIRED',
          timeRemainingHours: 0,
        }),
      ).toContain('restart');

      expect(
        deriveWorkExperienceNextAction({
          status: 'VERIFIED',
          hasValidatedProof: true,
        }),
      ).toContain('verified');
    });
  });
});
