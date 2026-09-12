import type { EvidenceType, EvidenceVerificationStatus } from './enums.js';

/** Evidence types that can satisfy professional / project-required verification gates. */
export const SKILL_DEMONSTRATION_EVIDENCE_TYPES = [
  'PROJECT',
  'WORK_EXPERIENCE',
] as const satisfies readonly EvidenceType[];

export type SkillDemonstrationEvidenceType = (typeof SKILL_DEMONSTRATION_EVIDENCE_TYPES)[number];

/**
 * Whether linked evidence counts toward skill verification finalize gates.
 * Self-reported or pending rows do not satisfy PROFESSIONAL evidence requirements.
 */
export function qualifiesAsSkillDemonstrationEvidence(params: {
  evidenceType: EvidenceType;
  relatedSkillCodes: readonly string[];
  catalogSkillCode: string;
  verificationStatus: EvidenceVerificationStatus;
}): boolean {
  if (
    !SKILL_DEMONSTRATION_EVIDENCE_TYPES.includes(
      params.evidenceType as SkillDemonstrationEvidenceType,
    )
  ) {
    return false;
  }
  if (!params.relatedSkillCodes.includes(params.catalogSkillCode)) {
    return false;
  }
  return params.verificationStatus === 'VERIFIED';
}

/** Provisional linked evidence — supports PROVISIONAL claim settlement, not full VERIFIED. */
export function qualifiesAsProvisionalDemonstrationEvidence(params: {
  evidenceType: EvidenceType;
  relatedSkillCodes: readonly string[];
  catalogSkillCode: string;
  verificationStatus: EvidenceVerificationStatus;
}): boolean {
  if (
    !SKILL_DEMONSTRATION_EVIDENCE_TYPES.includes(
      params.evidenceType as SkillDemonstrationEvidenceType,
    )
  ) {
    return false;
  }
  if (!params.relatedSkillCodes.includes(params.catalogSkillCode)) {
    return false;
  }
  return params.verificationStatus === 'PROVISIONAL' || params.verificationStatus === 'VERIFIED';
}
