import type {
  WorkExperienceDocumentAuthenticity,
  WorkExperienceDocumentAuthenticityStatus,
  WorkExperienceLetterAuthenticityExtract,
  WorkExperienceLetterAuthenticityResult,
} from '@smart/contracts';
import { normalizeCompanyName, extractDomain } from './company-name.util.js';

const MIN_OCR_CONFIDENCE = 0.75;
const ILLEGIBLE_CONFIDENCE = 0.5;
const MIN_RAW_TEXT_LENGTH = 20;

export function parseStoredDocumentAuthenticity(
  validationResult: unknown,
): WorkExperienceDocumentAuthenticity {
  if (!validationResult || typeof validationResult !== 'object') {
    return { status: 'pending', result: null, checkedAt: null };
  }

  const record = validationResult as Record<string, unknown>;
  const authenticity = record.authenticity;
  if (!authenticity || typeof authenticity !== 'object') {
    return { status: 'pending', result: null, checkedAt: null };
  }

  const auth = authenticity as Record<string, unknown>;
  const status = auth.status;
  if (
    status !== 'pending' &&
    status !== 'doc_ok' &&
    status !== 'doc_flagged' &&
    status !== 'voided'
  ) {
    return { status: 'pending', result: null, checkedAt: null };
  }

  return {
    status,
    result: (auth.result as WorkExperienceLetterAuthenticityResult | null) ?? null,
    checkedAt: typeof auth.checkedAt === 'string' ? auth.checkedAt : null,
  };
}

export function mergeAuthenticityIntoValidationResult(
  existing: unknown,
  authenticity: WorkExperienceDocumentAuthenticity,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return {
    ...base,
    authenticity,
  };
}

export function evaluateLetterAuthenticity(params: {
  claimedCompanyName: string;
  claimedCompanyWebsite: string | null;
  extracted: WorkExperienceLetterAuthenticityExtract;
  rawTextLength: number;
}): {
  status: Extract<WorkExperienceDocumentAuthenticityStatus, 'doc_ok' | 'doc_flagged'>;
  result: WorkExperienceLetterAuthenticityResult;
} {
  const flagReasons: string[] = [];

  const normExtracted = normalizeCompanyName(params.extracted.companyName);
  const normClaimed = normalizeCompanyName(params.claimedCompanyName);
  const companyNameMatch =
    Boolean(normExtracted && normClaimed) &&
    (normExtracted.includes(normClaimed) || normClaimed.includes(normExtracted));

  const claimedDomain = extractDomain(params.claimedCompanyWebsite);
  const extractedDomain =
    extractDomain(params.extracted.companyDomain) ??
    extractDomain(
      params.extracted.companyName?.includes('.') ? params.extracted.companyName : null,
    );
  const domainMatch =
    !claimedDomain ||
    !extractedDomain ||
    claimedDomain === extractedDomain ||
    extractedDomain.endsWith(`.${claimedDomain}`) ||
    claimedDomain.endsWith(`.${extractedDomain}`);

  if (params.rawTextLength < MIN_RAW_TEXT_LENGTH) {
    flagReasons.push('ILLEGIBLE: insufficient extractable text');
  }
  if (params.extracted.confidence < ILLEGIBLE_CONFIDENCE) {
    flagReasons.push(`ILLEGIBLE: low OCR confidence (${params.extracted.confidence})`);
  }
  if (!companyNameMatch) {
    flagReasons.push('COMPANY_MISMATCH: OCR company does not match claim');
  }
  if (claimedDomain && extractedDomain && !domainMatch) {
    flagReasons.push('DOMAIN_MISMATCH: document domain does not match claimed company website');
  }
  if (!params.extracted.hasLetterhead) {
    flagReasons.push('MISSING_LETTERHEAD');
  }
  if (!params.extracted.hasSignatureBlock) {
    flagReasons.push('MISSING_SIGNATURE_BLOCK');
  }
  if (
    params.extracted.confidence < MIN_OCR_CONFIDENCE &&
    params.extracted.confidence >= ILLEGIBLE_CONFIDENCE
  ) {
    flagReasons.push(`LOW_OCR_CONFIDENCE (${params.extracted.confidence})`);
  }

  const result: WorkExperienceLetterAuthenticityResult = {
    companyNameMatch,
    domainMatch,
    hasLetterhead: params.extracted.hasLetterhead,
    hasSignatureBlock: params.extracted.hasSignatureBlock,
    ocrConfidence: params.extracted.confidence,
    flagReasons,
  };

  return {
    status: flagReasons.length === 0 ? 'doc_ok' : 'doc_flagged',
    result,
  };
}
