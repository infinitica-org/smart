import type { CertificateProficiency, EvidenceVerificationMethod } from '@smart/contracts';

/**
 * Trust normalization for certificate/credential evidence (S6-VV-72).
 *
 * Confidence for these two sources is calibrated from *how* a claim was
 * verified, not from the candidate's self-assessed proficiency — a Tier 3
 * OCR/heuristic pass (or an unverified self-attestation) must never carry the
 * same weight as a real issuer-API or public-registry confirmation, even if
 * both ultimately reached a "verified" status.
 *
 * Owner: Ramansh.
 */

export type CertificateVerificationTier =
  'TIER_1_ISSUER_API' | 'TIER_2_PUBLIC_URL' | 'TIER_3_OCR_HEURISTIC';

/** Confidence assigned to a CandidateCertificate by the automated tier that verified it. */
export const CERTIFICATE_TIER_CONFIDENCE: Readonly<Record<CertificateVerificationTier, number>> = {
  TIER_1_ISSUER_API: 0.85,
  TIER_2_PUBLIC_URL: 0.65,
  // OCR is a byte-scan heuristic, not a real vision/OCR model — treat it like a stub.
  TIER_3_OCR_HEURISTIC: 0.35,
};

/** Confidence for a cert whose automated tier is unknown (e.g. endorsement-only path). */
export const CERTIFICATE_UNKNOWN_TIER_CONFIDENCE = 0.4;

/** Confidence assigned to a ProfessionalCredential by its persisted verificationMethod. */
export const CREDENTIAL_VERIFICATION_METHOD_CONFIDENCE: Partial<
  Record<EvidenceVerificationMethod, number>
> = {
  ISSUER: 0.85,
  DOCUMENT: 0.35,
};

/** Confidence for a credential with no automatable verification method (e.g. SELF_ATTESTED). */
export const CREDENTIAL_UNKNOWN_METHOD_CONFIDENCE = 0.3;

export function confidenceForCertificateTier(tier: CertificateVerificationTier | null): number {
  if (!tier) return CERTIFICATE_UNKNOWN_TIER_CONFIDENCE;
  return CERTIFICATE_TIER_CONFIDENCE[tier];
}

export function confidenceForCredentialMethod(method: EvidenceVerificationMethod | null): number {
  if (!method) return CREDENTIAL_UNKNOWN_METHOD_CONFIDENCE;
  return CREDENTIAL_VERIFICATION_METHOD_CONFIDENCE[method] ?? CREDENTIAL_UNKNOWN_METHOD_CONFIDENCE;
}

/** Self-assessed proficiency is a claim strength, never a verified score — kept separate from confidence. */
export const CERTIFICATE_PROFICIENCY_SCORE: Readonly<Record<CertificateProficiency, number>> = {
  BEGINNER: 0.3,
  INTERMEDIATE: 0.55,
  ADVANCED: 0.75,
  EXPERT: 0.95,
};

/**
 * ProfessionalCredential has no per-skill proficiency (coveredSkillCodes is a flat
 * list) — a held professional credential is treated as a uniformly strong claim
 * across the skills it covers, with confidence doing the trust calibration instead.
 */
export const PROFESSIONAL_CREDENTIAL_CLAIM_SCORE = 0.75;
