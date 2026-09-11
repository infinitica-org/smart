import { describe, expect, it } from 'vitest';
import {
  evaluateLetterAuthenticity,
  mergeAuthenticityIntoValidationResult,
  parseStoredDocumentAuthenticity,
} from './work-experience-document-authenticity.util.js';

describe('evaluateLetterAuthenticity', () => {
  const baseExtract = {
    candidateName: 'Jane Doe',
    companyName: 'Acme Corporation Pvt Ltd',
    companyDomain: 'acme.com',
    hasLetterhead: true,
    hasSignatureBlock: true,
    confidence: 0.92,
  };

  it('returns doc_ok when letterhead, signature, company, and domain align', () => {
    const outcome = evaluateLetterAuthenticity({
      claimedCompanyName: 'Acme Corporation',
      claimedCompanyWebsite: 'https://www.acme.com',
      extracted: baseExtract,
      rawTextLength: 500,
    });

    expect(outcome.status).toBe('doc_ok');
    expect(outcome.result.flagReasons).toHaveLength(0);
  });

  it('returns doc_flagged on company mismatch without implying fraud', () => {
    const outcome = evaluateLetterAuthenticity({
      claimedCompanyName: 'Acme Corporation',
      claimedCompanyWebsite: 'https://www.acme.com',
      extracted: { ...baseExtract, companyName: 'Globex Industries' },
      rawTextLength: 500,
    });

    expect(outcome.status).toBe('doc_flagged');
    expect(outcome.result.companyNameMatch).toBe(false);
    expect(outcome.result.flagReasons.some((r) => r.includes('COMPANY_MISMATCH'))).toBe(true);
  });

  it('returns doc_flagged when OCR text is illegible', () => {
    const outcome = evaluateLetterAuthenticity({
      claimedCompanyName: 'Acme Corporation',
      claimedCompanyWebsite: null,
      extracted: { ...baseExtract, confidence: 0.2 },
      rawTextLength: 5,
    });

    expect(outcome.status).toBe('doc_flagged');
    expect(outcome.result.flagReasons.some((r) => r.startsWith('ILLEGIBLE'))).toBe(true);
  });
});

describe('parseStoredDocumentAuthenticity', () => {
  it('reads authenticity block from validationResult JSON', () => {
    const parsed = parseStoredDocumentAuthenticity({
      authenticity: {
        status: 'doc_flagged',
        result: { flagReasons: ['MISSING_LETTERHEAD'] },
        checkedAt: '2026-09-10T10:00:00.000Z',
      },
    });

    expect(parsed.status).toBe('doc_flagged');
    expect(parsed.checkedAt).toBe('2026-09-10T10:00:00.000Z');
  });

  it('defaults to pending when authenticity block is absent', () => {
    expect(parseStoredDocumentAuthenticity(null).status).toBe('pending');
  });
});

describe('mergeAuthenticityIntoValidationResult', () => {
  it('preserves existing proof validation keys', () => {
    const merged = mergeAuthenticityIntoValidationResult(
      { validationStatus: 'VALIDATED', documentType: 'EXPERIENCE_LETTER' },
      {
        status: 'doc_ok',
        result: null,
        checkedAt: '2026-09-10T10:00:00.000Z',
      },
    );

    expect(merged.validationStatus).toBe('VALIDATED');
    expect((merged.authenticity as { status: string }).status).toBe('doc_ok');
  });
});
