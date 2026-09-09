import { z } from 'zod';

/**
 * SMART canonical domain enumerations.
 *
 * These values appear in the database, in Kafka payloads, in HTTP responses and
 * in the UI. Changing a member is a breaking change for all six engineers —
 * it is a `@smart/contracts` PR with an ADR, reviewed by the architect.
 *
 * Source of truth: ARCHITECTURE.md §5 (schema), §6 (tier engine), §8–9 (taxonomy).
 * Owner: Tino (System Architect).
 */

/* -------------------------------------------------------------------------- */
/*                                   Tiers                                    */
/* -------------------------------------------------------------------------- */

/**
 * Criterion-referenced performance bands. A tier is always relative to a
 * calibrated cut score for a specific track+level — never a raw percentage.
 *
 * `BELOW_BRONZE` is deliberately not a "fail": it is tracked internally and
 * produces a private gap report. It is never displayed as a public tier.
 */
export const TIERS = ['GOLD', 'SILVER', 'BRONZE', 'BELOW_BRONZE'] as const;
export const TierSchema = z.enum(TIERS);
export type Tier = z.infer<typeof TierSchema>;

/** Tiers that may appear on a public certificate. */
export const CERTIFIABLE_TIERS = ['GOLD', 'SILVER', 'BRONZE'] as const;
export const CertifiableTierSchema = z.enum(CERTIFIABLE_TIERS);
export type CertifiableTier = z.infer<typeof CertifiableTierSchema>;

/** Employer-facing readiness label for each tier (ARCHITECTURE.md §6). */
export const TIER_LABEL: Readonly<Record<Tier, string>> = {
  GOLD: 'Ready Now',
  SILVER: 'Needs Supervised Onboarding',
  BRONZE: 'Core Knowledge Present',
  BELOW_BRONZE: 'Not Yet Certified',
} as const;

/** Ordering used for progression checks and aggregate reporting. */
export const TIER_RANK: Readonly<Record<Tier, number>> = {
  BELOW_BRONZE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
} as const;

/* -------------------------------------------------------------------------- */
/*                                   Levels                                   */
/* -------------------------------------------------------------------------- */

export const LEVEL_NUMBERS = [1, 2, 3, 4, 5] as const;
export const LevelNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type LevelNumber = z.infer<typeof LevelNumberSchema>;

/** Delivery/evaluation format of a level. Drives which player the UI renders. */
export const LEVEL_FORMATS = ['MCQ', 'SANDBOX', 'AUDIO_BARS', 'DEFENSE', 'CAPSTONE'] as const;
export const LevelFormatSchema = z.enum(LEVEL_FORMATS);
export type LevelFormat = z.infer<typeof LevelFormatSchema>;

/* -------------------------------------------------------------------------- */
/*                              Tracks & domains                              */
/* -------------------------------------------------------------------------- */

export const TRACK_CATEGORIES = ['TECH', 'MBA'] as const;
export const TrackCategorySchema = z.enum(TRACK_CATEGORIES);
export type TrackCategory = z.infer<typeof TrackCategorySchema>;

export const TRACK_CODES = [
  // 5 IT tracks
  'TECH_FULLSTACK',
  'TECH_AIML',
  'TECH_CLOUD_DEVOPS',
  'TECH_CYBERSECURITY',
  'TECH_DATA_ANALYST',
  // 5 MBA tracks
  'MBA_FINANCE',
  'MBA_BUSINESS_ANALYTICS',
  'MBA_MARKETING',
  'MBA_OPERATIONS',
  'MBA_HR',
] as const;
export const TrackCodeSchema = z.enum(TRACK_CODES);
export type TrackCode = z.infer<typeof TrackCodeSchema>;

/** Competency domains A–E within a track (ARCHITECTURE.md §8–9). */
export const DOMAIN_CODES = ['A', 'B', 'C', 'D', 'E'] as const;
export const DomainCodeSchema = z.enum(DOMAIN_CODES);
export type DomainCode = z.infer<typeof DomainCodeSchema>;

/**
 * Honesty-over-inflation: a track may not advertise validation it has not
 * earned. `VALIDATED_LEAD` requires a recorded practitioner panel AND
 * Cronbach's alpha >= 0.70.
 */
export const TRACK_LAUNCH_STATUSES = ['DRAFT', 'AVAILABLE_NEW', 'VALIDATED_LEAD'] as const;
export const TrackLaunchStatusSchema = z.enum(TRACK_LAUNCH_STATUSES);
export type TrackLaunchStatus = z.infer<typeof TrackLaunchStatusSchema>;

/* -------------------------------------------------------------------------- */
/*                             Identity & access                              */
/* -------------------------------------------------------------------------- */

export const USER_ROLES = [
  'SUPER_ADMIN',
  'INSTITUTION_ADMIN', // TPO
  'PLACEMENT_STAFF',
  'STUDENT',
  'B2B_PARTNER', // X-SMART-API-KEY holder
  'PUBLIC', // unauthenticated verification traffic
] as const;
export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AUTH_PROVIDERS = ['PASSWORD', 'GOOGLE', 'GITHUB', 'SAML', 'OIDC'] as const;
export const AuthProviderSchema = z.enum(AUTH_PROVIDERS);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const PLAN_CODES = ['FREE', 'BASIC', 'PRO'] as const;
export const PlanCodeSchema = z.enum(PLAN_CODES);
export type PlanCode = z.infer<typeof PlanCodeSchema>;

export const TENANT_VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const TenantVerificationStatusSchema = z.enum(TENANT_VERIFICATION_STATUSES);
export type TenantVerificationStatus = z.infer<typeof TenantVerificationStatusSchema>;

export const INSTITUTION_LIST_STATUSES = ['ACTIVE', 'HELD', 'DEACTIVATED'] as const;
export const InstitutionListStatusSchema = z.enum(INSTITUTION_LIST_STATUSES);
export type InstitutionListStatus = z.infer<typeof InstitutionListStatusSchema>;

export const STUDENT_INVITE_FILTERS = [
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'REVOKED',
  'NONE',
] as const;
export const StudentInviteFilterSchema = z.enum(STUDENT_INVITE_FILTERS);
export type StudentInviteFilter = z.infer<typeof StudentInviteFilterSchema>;

export const COMPANY_MODES = ['SERVICE', 'PRODUCT'] as const;
export const CompanyModeSchema = z.enum(COMPANY_MODES);
export type CompanyMode = z.infer<typeof CompanyModeSchema>;

export const CANDIDATE_VIEW_REASON_CODES = [
  'support_ticket',
  'integrity_review',
  'billing_dispute',
  'other',
] as const;
export const CandidateViewReasonCodeSchema = z.enum(CANDIDATE_VIEW_REASON_CODES);
export type CandidateViewReasonCode = z.infer<typeof CandidateViewReasonCodeSchema>;

export const SESSION_HOLD_CODES = [
  'institution_held',
  'institution_deactivated',
  'account_held',
  'company_held',
  'company_deactivated',
] as const;
export const SessionHoldCodeSchema = z.enum(SESSION_HOLD_CODES);
export type SessionHoldCode = z.infer<typeof SessionHoldCodeSchema>;

export const SESSION_HOLD_MESSAGE: Readonly<Record<SessionHoldCode, string>> = {
  institution_held: 'This institution is on hold. You cannot use SMART until it is released.',
  institution_deactivated:
    'This institution is deactivated. You cannot use SMART until it is restored.',
  account_held: 'Your account is on hold. Contact your TPO or platform administrator.',
  company_held: 'This company is on hold. You cannot use SMART until it is released.',
  company_deactivated: 'This company is deactivated. You cannot use SMART until it is restored.',
};

export function isSessionHoldCode(code: string): code is SessionHoldCode {
  return (SESSION_HOLD_CODES as readonly string[]).includes(code);
}

/* -------------------------------------------------------------------------- */
/*                              Items & responses                             */
/* -------------------------------------------------------------------------- */

export const ITEM_TYPES = [
  'MCQ_SINGLE',
  'MCQ_MULTI',
  'NUMERIC_ENTRY',
  'SHORT_ANSWER',
  'CODE_TASK',
  'SQL_TASK',
  'SCENARIO_RESPONSE',
  'SPOKEN_RESPONSE',
  'DEFENSE_PROMPT',
  'ARTIFACT_UPLOAD',
] as const;
export const ItemTypeSchema = z.enum(ITEM_TYPES);
export type ItemType = z.infer<typeof ItemTypeSchema>;

export const DIFFICULTY_TAGS = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const;
export const DifficultyTagSchema = z.enum(DIFFICULTY_TAGS);
export type DifficultyTag = z.infer<typeof DifficultyTagSchema>;

/** Which mechanism produced a score. Recorded per response for auditability. */
export const EVALUATORS = [
  'AUTO_MCQ',
  'AUTO_NUMERIC',
  'SANDBOX_CHECK',
  'CHECKLIST',
  'LLM_BARS',
  'HUMAN_RATER',
  'HYBRID',
] as const;
export const EvaluatorSchema = z.enum(EVALUATORS);
export type Evaluator = z.infer<typeof EvaluatorSchema>;

/* -------------------------------------------------------------------------- */
/*                            Attempts & integrity                            */
/* -------------------------------------------------------------------------- */

export const ATTEMPT_STATUSES = [
  'IN_PROGRESS',
  'SUBMITTED',
  'AUTO_SUBMITTED',
  'EVALUATING',
  'EVALUATED',
  'ABANDONED',
  'VOIDED',
] as const;
export const AttemptStatusSchema = z.enum(ATTEMPT_STATUSES);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

/**
 * Integrity state of an attempt.
 *
 * PRODUCT GUARANTEE: an attempt whose flag is not `CLEAN` or `CLEARED` must
 * never produce a certificate. It routes to the admin integrity review queue.
 * Enforced in the certificate module (owner: Vishal Bharath R).
 */
export const INTEGRITY_FLAGS = [
  'CLEAN',
  'FLAGGED_TIMING', // response-time anomaly / item exposure pattern
  'FLAGGED_PROCTOR', // webcam or browser-lockdown violation
  'FLAGGED_SIMILARITY', // plagiarism / prior-submission similarity
  'FLAGGED_AUDIO', // pre-recorded playback suspected (VAD / fingerprint)
  'UNDER_REVIEW', // trust & safety reviewing
  'CLEARED', // reviewed and cleared by an admin
] as const;
export const IntegrityFlagSchema = z.enum(INTEGRITY_FLAGS);
export type IntegrityFlag = z.infer<typeof IntegrityFlagSchema>;

/** Flags that permit certificate issuance. */
export const ISSUABLE_INTEGRITY_FLAGS = ['CLEAN', 'CLEARED'] as const;

/* -------------------------------------------------------------------------- */
/*                               AI providers                                 */
/* -------------------------------------------------------------------------- */

export const AI_PROVIDERS = ['ANTHROPIC', 'GOOGLE', 'OPENROUTER'] as const;
export const AiProviderSchema = z.enum(AI_PROVIDERS);
export type AiProvider = z.infer<typeof AiProviderSchema>;

/**
 * Model roles rather than literal model strings: the concrete model id lives in
 * validated config so a provider version bump is a config change, not a code
 * change across five modules.
 */
export const AI_MODEL_ROLES = [
  'PRIMARY_REASONING', // Claude 5 Sonnet — BARS, L4 defense, JD parsing
  'FAST_EXTRACTION', // Claude 4.7 — item pre-processing, classification
  'FALLBACK_REASONING', // Gemini 2.5 Pro
  'FALLBACK_FAST', // Gemini 2.5 Flash
  'EMBEDDING', // vector embeddings for pgvector
] as const;
export const AiModelRoleSchema = z.enum(AI_MODEL_ROLES);
export type AiModelRole = z.infer<typeof AiModelRoleSchema>;

/**
 * Priority lanes on the AI gateway (ARCHITECTURE.md §7.1).
 * P1 reserves 40% of quota: a live L4 defense must never be starved by a batch
 * JD-parsing job, because that is a ruined exam rather than a slow report.
 */
export const AI_PRIORITIES = ['P1_REALTIME', 'P2_ASYNC_EVAL', 'P3_BATCH'] as const;
export const AiPrioritySchema = z.enum(AI_PRIORITIES);
export type AiPriority = z.infer<typeof AiPrioritySchema>;

/* -------------------------------------------------------------------------- */
/*                          Calibration & reliability                         */
/* -------------------------------------------------------------------------- */

export const CALIBRATION_STATUSES = [
  'NOT_CALIBRATED',
  'PROVISIONAL', // cut scores exist but panel is incomplete — confidence note downgraded
  'PANEL_CALIBRATED', // 3–5 practitioner panel recorded
  'RELIABILITY_VERIFIED', // panel recorded AND Cronbach's alpha >= 0.70
] as const;
export const CalibrationStatusSchema = z.enum(CALIBRATION_STATUSES);
export type CalibrationStatus = z.infer<typeof CalibrationStatusSchema>;

export const STANDARD_SETTING_METHODS = ['ANGOFF', 'BOOKMARK', 'CONTRASTING_GROUPS'] as const;
export const StandardSettingMethodSchema = z.enum(STANDARD_SETTING_METHODS);
export type StandardSettingMethod = z.infer<typeof StandardSettingMethodSchema>;

/** Academic minimum for internal reliability (Cronbach's alpha / KR-20). */
export const RELIABILITY_ALPHA_FLOOR = 0.7;

/**
 * Inter-rater agreement floor for automated scoring. Below this, automated
 * grading auto-pauses and routes to human raters (owner: Ramansh).
 */
export const COHENS_KAPPA_FLOOR = 0.65;

/* -------------------------------------------------------------------------- */
/*                                 Placement                                  */
/* -------------------------------------------------------------------------- */

export const PLACEMENT_OUTCOMES = [
  'NOT_SHORTLISTED',
  'SHORTLISTED',
  'INTERVIEWED',
  'OFFERED',
  'ACCEPTED',
  'DECLINED',
] as const;
export const PlacementOutcomeSchema = z.enum(PLACEMENT_OUTCOMES);
export type PlacementOutcome = z.infer<typeof PlacementOutcomeSchema>;

export const JD_PARSE_STATUSES = ['PENDING', 'PARSED', 'FAILED', 'MANUALLY_CORRECTED'] as const;
export const JdParseStatusSchema = z.enum(JD_PARSE_STATUSES);
export type JdParseStatus = z.infer<typeof JdParseStatusSchema>;

/**
 * Claimed skill proficiency on a catalog skill (PRD v1 §7.3). Tiers (Gold /
 * Silver / Bronze) still come from cut scores — do not invent a parallel score.
 */
export const SKILL_PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const SkillProficiencySchema = z.enum(SKILL_PROFICIENCIES);
export type SkillProficiency = z.infer<typeof SkillProficiencySchema>;

/**
 * Skill-claim state machine. Technical failures must not consume a strike.
 *
 * Product Owner / playbook lock (1 Sep 2026): one reattempt, then 35-day refresh.
 * `BEGINNER_REATTEMPT` is that single retry. `LOCKED` lasts
 * {@link SKILL_REFRESH_DAYS} — not a second retry window.
 */
export const SKILL_CLAIM_STATUSES = [
  'DECLARED',
  'VERIFIED',
  'BEGINNER_REATTEMPT',
  'LOCKED',
] as const;

/** Initial attempt + one reattempt. SE-T01 must not implement a third try. */
export const SKILL_MAX_ATTEMPTS = 2;

/** Reattempts after the first fail. Not 2 (old PRD) and not 3 (old playbook). */
export const SKILL_REATTEMPTS = 1;

/** Days after lock (or verified expiry) before the skill can be declared again. */
export const SKILL_REFRESH_DAYS = 35;

/** Hours between the first fail and the single reattempt. */
export const SKILL_INTER_ATTEMPT_COOLDOWN_HOURS = 48;
export const SkillClaimStatusSchema = z.enum(SKILL_CLAIM_STATUSES);
export type SkillClaimStatus = z.infer<typeof SkillClaimStatusSchema>;

export const JOB_OPENING_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const;
export const JobOpeningStatusSchema = z.enum(JOB_OPENING_STATUSES);
export type JobOpeningStatus = z.infer<typeof JobOpeningStatusSchema>;

/** V1 TPO structured opening — closed set; not free text. */
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
] as const;
export const EmploymentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const WORK_EXPERIENCE_VERIFICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_EMPLOYER',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
] as const;
export const WorkExperienceVerificationStatusSchema = z.enum(WORK_EXPERIENCE_VERIFICATION_STATUSES);
export type WorkExperienceVerificationStatus = z.infer<
  typeof WorkExperienceVerificationStatusSchema
>;

export const EXPERIENCE_DOCUMENT_TYPES = [
  'OFFER_LETTER',
  'EXPERIENCE_LETTER',
  'PAYSLIP',
  'RELIEVING_LETTER',
  'FORM_16',
  'OTHER',
] as const;
export const ExperienceDocumentTypeSchema = z.enum(EXPERIENCE_DOCUMENT_TYPES);
export type ExperienceDocumentType = z.infer<typeof ExperienceDocumentTypeSchema>;

/**
 * Company ATS columns (CO-T02 kanban). V1 is TPO-mediated; candidate job feed
 * is V2. Order matches the kanban left-to-right: New Matches -> Shortlisted ->
 * AI-Verified -> Interviewing -> Offer -> Hired, with Rejected/Withdrawn as
 * off-pipeline terminal columns.
 */
export const ATS_STAGES = [
  'APPLIED',
  'SHORTLISTED',
  'AI_VERIFIED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export const AtsStageSchema = z.enum(ATS_STAGES);
export type AtsStage = z.infer<typeof AtsStageSchema>;

/** How a match score was produced. V1 ships RULES; HYBRID is optional cosine. */
export const MATCH_METHODS = ['RULES', 'HYBRID'] as const;
export const MatchMethodSchema = z.enum(MATCH_METHODS);
export type MatchMethod = z.infer<typeof MatchMethodSchema>;

/* -------------------------------------------------------------------------- */
/*                          Certificates & webhooks                           */
/* -------------------------------------------------------------------------- */

export const CERTIFICATE_STATUSES = [
  'PENDING_ISSUE',
  'BLOCKED_INTEGRITY',
  'ISSUED',
  'SUPERSEDED', // replaced by a higher level cleared on the same track
  'REVOKED',
] as const;
export const CertificateStatusSchema = z.enum(CERTIFICATE_STATUSES);
export type CertificateStatus = z.infer<typeof CertificateStatusSchema>;

export const WEBHOOK_DELIVERY_STATUSES = [
  'PENDING',
  'DELIVERED',
  'RETRYING',
  'DEAD_LETTERED',
] as const;
export const WebhookDeliveryStatusSchema = z.enum(WEBHOOK_DELIVERY_STATUSES);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusSchema>;

/** CN-T08 / SE-T03 project lifecycle. Agents never set REJECTED. */
export const PROJECT_STATUSES = ['SUBMITTED', 'VERIFIED', 'UNDER_REVIEW', 'REJECTED'] as const;
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

/**
 * Candidate certificate verification (externally-issued certs, e.g. AWS/Coursera —
 * distinct from the platform's own issued `Certificate`/`Tier` model above).
 * Verification is either LLM-based (owned separately, not this contract's concern
 * beyond recording the method) or endorsement-based (a named, work-email-gated
 * external reviewer approves/rejects — see `CertificateEndorsementStatusSchema`).
 */
export const CANDIDATE_CERTIFICATE_STATUSES = [
  'DECLARED',
  'UPLOADED',
  'IN_VERIFICATION',
  'VERIFIED',
  'REJECTED',
] as const;
export const CandidateCertificateStatusSchema = z.enum(CANDIDATE_CERTIFICATE_STATUSES);
export type CandidateCertificateStatus = z.infer<typeof CandidateCertificateStatusSchema>;

export const CERTIFICATE_SOURCE_STATUSES = [
  'pending',
  'source_verified',
  'source_failed',
  'voided',
] as const;
export const CertificateSourceStatusSchema = z.enum(CERTIFICATE_SOURCE_STATUSES);
export type CertificateSourceStatus = z.infer<typeof CertificateSourceStatusSchema>;

export const CERTIFICATE_VERIFICATION_METHODS = ['LLM', 'ENDORSEMENT'] as const;
export const CertificateVerificationMethodSchema = z.enum(CERTIFICATE_VERIFICATION_METHODS);
export type CertificateVerificationMethod = z.infer<typeof CertificateVerificationMethodSchema>;

/**
 * Self-assessed proficiency for a certificate's claimed skills. Deliberately
 * separate from `SkillProficiencySchema` (BEGINNER/INTERMEDIATE/ADVANCED only,
 * tied to the SkillClaim verification-threshold framework) — this one adds
 * EXPERT and is purely a candidate self-assessment, never itself a verified claim.
 */
export const CERTIFICATE_PROFICIENCIES = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
] as const;
export const CertificateProficiencySchema = z.enum(CERTIFICATE_PROFICIENCIES);
export type CertificateProficiency = z.infer<typeof CertificateProficiencySchema>;

export const CERTIFICATE_ENDORSEMENT_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;
export const CertificateEndorsementStatusSchema = z.enum(CERTIFICATE_ENDORSEMENT_STATUSES);
export type CertificateEndorsementStatus = z.infer<typeof CertificateEndorsementStatusSchema>;

export const PROJECT_VERIFY_FLAGS = [
  'DUPLICATE_TEXT',
  'PUBLIC_WEB_SIMILARITY',
  'TECH_AGE',
  'SNAPSHOT_UNAVAILABLE',
  'LOW_CONFIDENCE',
  'LLM_UNAVAILABLE',
  'STACK_LANGUAGE_MISMATCH',
] as const;
export const ProjectVerifyFlagSchema = z.enum(PROJECT_VERIFY_FLAGS);
export type ProjectVerifyFlag = z.infer<typeof ProjectVerifyFlagSchema>;

export const GITHUB_SNAPSHOT_UNAVAILABLE_REASONS = [
  'oauth_missing',
  'not_found',
  'private',
  'rate_limited',
  'timeout',
] as const;
export const GithubSnapshotUnavailableReasonSchema = z.enum(GITHUB_SNAPSHOT_UNAVAILABLE_REASONS);
export type GithubSnapshotUnavailableReason = z.infer<typeof GithubSnapshotUnavailableReasonSchema>;

/* -------------------------------------------------------------------------- */
/*                     Polymorphic Assessment & Verification                  */
/* -------------------------------------------------------------------------- */

/**
 * SE-T10 — Assessable target discriminator for polymorphic assessment sessions.
 */
export const ASSESSABLE_TYPES = ['SKILL', 'CERTIFICATION'] as const;
export const AssessableTypeSchema = z.enum(ASSESSABLE_TYPES);
export type AssessableType = z.infer<typeof AssessableTypeSchema>;

/**
 * SE-T10 — Canonical shared verification status vocabulary.
 */
export const SHARED_VERIFICATION_STATUSES = [
  'unverified',
  'in_progress',
  'verified',
  'rejected',
  'voided',
] as const;
export const SharedVerificationStatusSchema = z.enum(SHARED_VERIFICATION_STATUSES);
export type SharedVerificationStatus = z.infer<typeof SharedVerificationStatusSchema>;
