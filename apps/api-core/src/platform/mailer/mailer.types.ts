export const EMAIL_QUEUE = 'email_send' as const;

export type EmailTemplateName = 'institution-admin-invite' | 'student-invite' | 'invite-reminder';

export interface EmailJobPayload {
  readonly to: string;
  readonly template: EmailTemplateName;
  readonly data: {
    readonly fullName: string;
    readonly institutionName: string;
    readonly inviteUrl: string;
    readonly batchName?: string | null;
  };
}
