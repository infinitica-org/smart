export const EMAIL_QUEUE = 'email_send' as const;

export type EmailTemplateName =
  | 'institution-admin-invite'
  | 'platform-admin-invite'
  | 'student-invite'
  | 'invite-reminder'
  | 'opportunity-shortlisted'
  | 'application-stage-changed'
  | 'verification-passed'
  | 'verification-failed'
  | 'verification-locked'
  | 'work-experience-verifier-invite'
  | 'work-experience-verifier-reminder'
  | 'certificate-endorsement-request'
  /** WE-T03: manager endorsement invite (domain-validated corporate email, 5-day TTL) */
  | 'work-experience-manager-invite'
  /** WE-T03: manager endorsement reminder at day 3 (72h) */
  | 'work-experience-manager-reminder';

export interface InviteEmailData {
  readonly fullName: string;
  readonly institutionName: string;
  readonly inviteUrl: string;
  readonly batchName?: string | null;
}

export interface OpportunityEmailData {
  readonly fullName: string;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly applicationsUrl: string;
}

export interface StageChangeEmailData {
  readonly fullName: string;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly fromStage: string | null;
  readonly toStage: string;
  readonly applicationsUrl: string;
}

export interface VerificationEmailData {
  readonly fullName: string;
  readonly skillName: string;
  readonly statusLabel: string;
  readonly detail: string;
  readonly profileUrl: string;
}

export interface WorkExperienceVerifierInviteEmailData {
  readonly verifierName: string;
  readonly candidateName: string;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly verificationUrl: string;
  readonly expiresAtFormatted: string;
}

export interface WorkExperienceVerifierReminderEmailData {
  readonly verifierName: string;
  readonly candidateName: string;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly verificationUrl: string;
  readonly expiresAtFormatted: string;
}

export interface CertificateEndorsementRequestEmailData {
  readonly endorserName: string;
  readonly candidateName: string;
  readonly certificateTitle: string;
  readonly certificateIssuer: string;
  readonly endorsementUrl: string;
  readonly expiresAtFormatted: string;
}

export type EmailTemplateData =
  | InviteEmailData
  | OpportunityEmailData
  | StageChangeEmailData
  | VerificationEmailData
  | WorkExperienceVerifierInviteEmailData
  | WorkExperienceVerifierReminderEmailData
  | CertificateEndorsementRequestEmailData
  | WorkExperienceManagerEndorsementEmailData;

export interface EmailJobPayload {
  readonly to: string;
  readonly template: EmailTemplateName;
  readonly data: EmailTemplateData;
}

export interface WorkExperienceReminderJobPayload {
  readonly attemptId: string;
  readonly to: string;
  readonly template: EmailTemplateName;
  readonly data: EmailTemplateData;
}

export interface WorkExperienceExpireJobPayload {
  readonly attemptId: string;
  readonly experienceId: string;
}

export type EmailQueueJobData =
  | EmailJobPayload
  | WorkExperienceReminderJobPayload
  | WorkExperienceExpireJobPayload
  | WorkExperienceManagerReminderJobPayload
  | WorkExperienceManagerExpireJobPayload;

/** WE-T03: Manager endorsement email data (invite + reminder share same structure). */
export interface WorkExperienceManagerEndorsementEmailData {
  /** Manager's name if provided, else 'Hiring Manager'. */
  readonly managerName: string;
  readonly candidateName: string;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly startDate: string;
  readonly endDate: string;
  /** Full URL to the manager survey page including the token. */
  readonly surveyUrl: string;
  readonly expiresAtFormatted: string;
}

/** WE-T03: BullMQ job payload for manager endorsement reminder (day 3 / 72h). */
export interface WorkExperienceManagerReminderJobPayload {
  readonly endorsementId: string;
  readonly to: string;
  readonly template: EmailTemplateName;
  readonly data: WorkExperienceManagerEndorsementEmailData;
}

/** WE-T03: BullMQ job payload for manager endorsement expiry (day 5 / 120h). */
export interface WorkExperienceManagerExpireJobPayload {
  readonly endorsementId: string;
  readonly experienceId: string;
}
