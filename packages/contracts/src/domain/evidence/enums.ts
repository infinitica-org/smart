import { z } from 'zod';

/**
 * Evidence architecture enumerations (SMART Evidence & Onboarding Framework).
 * Owner: Ramansh. Review: Tino.
 */

export const EVIDENCE_TYPES = [
  'WORK_EXPERIENCE',
  'PROJECT',
  'CREDENTIAL',
  'PASSIVE_SIGNAL',
  'ASSESSMENT',
  'INTERVIEW',
  'ARTIFACT',
  'SELF_REPORT',
] as const;
export const EvidenceTypeSchema = z.enum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EVIDENCE_SOURCES = ['CANDIDATE', 'EMPLOYER', 'ISSUER', 'PLATFORM', 'SYSTEM'] as const;
export const EvidenceSourceSchema = z.enum(EVIDENCE_SOURCES);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const RESPONSIBILITY_LEVELS = [
  'OBSERVED',
  'ASSISTED',
  'IMPLEMENTED',
  'OWNED',
  'DESIGNED_DECIDED',
] as const;
export const ResponsibilityLevelSchema = z.enum(RESPONSIBILITY_LEVELS);
export type ResponsibilityLevel = z.infer<typeof ResponsibilityLevelSchema>;

export const RESPONSIBILITY_LEVEL_RANK: Readonly<Record<ResponsibilityLevel, number>> = {
  OBSERVED: 1,
  ASSISTED: 2,
  IMPLEMENTED: 3,
  OWNED: 4,
  DESIGNED_DECIDED: 5,
} as const;

export const INDEPENDENCE_LEVELS = ['SUPERVISED', 'PARTIAL', 'INDEPENDENT', 'LED_OTHERS'] as const;
export const IndependenceLevelSchema = z.enum(INDEPENDENCE_LEVELS);
export type IndependenceLevel = z.infer<typeof IndependenceLevelSchema>;

export const EVIDENCE_STRENGTHS = ['WEAK', 'MODERATE', 'STRONG', 'DIRECT'] as const;
export const EvidenceStrengthSchema = z.enum(EVIDENCE_STRENGTHS);
export type EvidenceStrength = z.infer<typeof EvidenceStrengthSchema>;

export const EVIDENCE_RELIABILITIES = ['LOW', 'MEDIUM', 'HIGH', 'VERIFIED'] as const;
export const EvidenceReliabilitySchema = z.enum(EVIDENCE_RELIABILITIES);
export type EvidenceReliability = z.infer<typeof EvidenceReliabilitySchema>;

export const FRESHNESS_CLASSES = ['CURRENT', 'RECENT', 'STALE', 'EXPIRED'] as const;
export const FreshnessClassSchema = z.enum(FRESHNESS_CLASSES);
export type FreshnessClass = z.infer<typeof FreshnessClassSchema>;

export const EVIDENCE_VERIFICATION_METHODS = [
  'SELF_ATTESTED',
  'DOCUMENT',
  'EMPLOYER',
  'ISSUER',
  'ASSESSMENT',
  'INTERVIEW',
  'ARTIFACT_REVIEW',
  'HUMAN_REVIEW',
  'PLATFORM_SIGNAL',
] as const;
export const EvidenceVerificationMethodSchema = z.enum(EVIDENCE_VERIFICATION_METHODS);
export type EvidenceVerificationMethod = z.infer<typeof EvidenceVerificationMethodSchema>;

export const EVIDENCE_VERIFICATION_STATUSES = [
  'PENDING',
  'PROVISIONAL',
  'VERIFIED',
  'DISPUTED',
  'REJECTED',
  'EXPIRED',
] as const;
export const EvidenceVerificationStatusSchema = z.enum(EVIDENCE_VERIFICATION_STATUSES);
export type EvidenceVerificationStatus = z.infer<typeof EvidenceVerificationStatusSchema>;

export const ARTIFACT_TYPES = [
  'CODE_REPOSITORY',
  'DESIGN',
  'REPORT',
  'RESEARCH_PAPER',
  'CAD_FILE',
  'FINANCIAL_MODEL',
  'PRESENTATION',
  'DATASET',
  'DEPLOYMENT',
  'PORTFOLIO',
  'OTHER',
] as const;
export const ArtifactTypeSchema = z.enum(ARTIFACT_TYPES);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const INTEGRITY_STATUSES = ['UNCHECKED', 'PASSED', 'FLAGGED', 'FAILED'] as const;
export const IntegrityStatusSchema = z.enum(INTEGRITY_STATUSES);
export type IntegrityStatus = z.infer<typeof IntegrityStatusSchema>;

export const ACCESSIBILITY_LEVELS = ['PUBLIC', 'RESTRICTED', 'PRIVATE', 'NDA'] as const;
export const AccessibilityLevelSchema = z.enum(ACCESSIBILITY_LEVELS);
export type AccessibilityLevel = z.infer<typeof AccessibilityLevelSchema>;

export const CREDENTIAL_TYPES = [
  'CERTIFICATION',
  'LICENSE',
  'DEGREE',
  'BADGE',
  'PROFESSIONAL_MEMBERSHIP',
] as const;
export const CredentialTypeSchema = z.enum(CREDENTIAL_TYPES);
export type CredentialType = z.infer<typeof CredentialTypeSchema>;

export const CREDENTIAL_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'PENDING_VERIFICATION',
] as const;
export const CredentialStatusSchema = z.enum(CREDENTIAL_STATUSES);
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

export const CORROBORATION_STATUSES = [
  'UNLINKED',
  'PARTIAL',
  'CORROBORATED',
  'CONTRADICTED',
] as const;
export const CorroborationStatusSchema = z.enum(CORROBORATION_STATUSES);
export type CorroborationStatus = z.infer<typeof CorroborationStatusSchema>;

export const VERIFICATION_DECISIONS = ['VERIFIED', 'PROVISIONAL', 'FAILED'] as const;
export const VerificationDecisionOutcomeSchema = z.enum(VERIFICATION_DECISIONS);
export type VerificationDecisionOutcome = z.infer<typeof VerificationDecisionOutcomeSchema>;

export const PROJECT_TYPES = [
  'ACADEMIC',
  'PERSONAL',
  'PROFESSIONAL',
  'OPEN_SOURCE',
  'CAPSTONE',
  'OTHER',
] as const;
export const ProjectTypeSchema = z.enum(PROJECT_TYPES);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

export const NDA_STATUSES = ['NONE', 'PARTIAL', 'FULL'] as const;
export const NdaStatusSchema = z.enum(NDA_STATUSES);
export type NdaStatus = z.infer<typeof NdaStatusSchema>;
