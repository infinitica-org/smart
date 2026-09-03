export const EMAIL_QUEUE = 'email_send' as const;

export type EmailTemplateName =
  | 'institution-admin-invite'
  | 'student-invite'
  | 'invite-reminder'
  | 'opportunity-shortlisted'
  | 'application-stage-changed'
  | 'verification-passed'
  | 'verification-failed'
  | 'verification-locked'
  | 'work-experience-verifier-invite'
  | 'work-experience-verifier-reminder';

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

export type EmailTemplateData =
  | InviteEmailData
  | OpportunityEmailData
  | StageChangeEmailData
  | VerificationEmailData
  | WorkExperienceVerifierInviteEmailData
  | WorkExperienceVerifierReminderEmailData;

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
  EmailJobPayload | WorkExperienceReminderJobPayload | WorkExperienceExpireJobPayload;
