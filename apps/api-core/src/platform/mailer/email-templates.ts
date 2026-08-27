import type { EmailTemplateName } from './mailer.types.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  data: {
    fullName: string;
    institutionName: string;
    inviteUrl: string;
    batchName?: string | null;
  },
): RenderedEmail {
  const greeting = `Hello ${data.fullName},`;
  const batchLine = data.batchName ? `<p>Batch: <strong>${data.batchName}</strong></p>` : '';

  switch (template) {
    case 'institution-admin-invite':
      return {
        subject: `You're invited to manage ${data.institutionName} on SMART`,
        html: `<p>${greeting}</p><p>You have been invited as an institution admin for <strong>${data.institutionName}</strong>.</p><p><a href="${data.inviteUrl}">Set your password and sign in</a></p><p>This link expires in 7 days.</p>`,
        text: `${greeting}\n\nYou have been invited as an institution admin for ${data.institutionName}.\n\nSet your password: ${data.inviteUrl}\n\nThis link expires in 7 days.`,
      };
    case 'student-invite':
      return {
        subject: `You're invited to SMART — ${data.institutionName}`,
        html: `<p>${greeting}</p><p>You have been invited to join <strong>${data.institutionName}</strong> on SMART.</p>${batchLine}<p><a href="${data.inviteUrl}">Set your password and get started</a></p><p>This link expires in 7 days.</p>`,
        text: `${greeting}\n\nYou have been invited to join ${data.institutionName} on SMART.${data.batchName ? `\nBatch: ${data.batchName}` : ''}\n\nSet your password: ${data.inviteUrl}\n\nThis link expires in 7 days.`,
      };
    case 'invite-reminder':
      return {
        subject: `Reminder: complete your SMART account setup`,
        html: `<p>${greeting}</p><p>Your invitation to <strong>${data.institutionName}</strong> is still pending.</p>${batchLine}<p><a href="${data.inviteUrl}">Set your password</a></p>`,
        text: `${greeting}\n\nYour invitation to ${data.institutionName} is still pending.\n\nSet your password: ${data.inviteUrl}`,
      };
  }
}
