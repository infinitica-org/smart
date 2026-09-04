import { renderEmailLayout, bulletList, paragraph, strong } from './email-layout.js';
import type {
  EmailTemplateData,
  EmailTemplateName,
  InviteEmailData,
  OpportunityEmailData,
  StageChangeEmailData,
  VerificationEmailData,
  WorkExperienceVerifierInviteEmailData,
  WorkExperienceVerifierReminderEmailData,
} from './mailer.types.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const THEMES = {
  invite: { accent: '#4f46e5', soft: '#eef2ff' },
  opportunity: { accent: '#059669', soft: '#ecfdf5' },
  stage: { accent: '#d97706', soft: '#fffbeb' },
  success: { accent: '#16a34a', soft: '#f0fdf4' },
  danger: { accent: '#dc2626', soft: '#fef2f2' },
  muted: { accent: '#64748b', soft: '#f8fafc' },
} as const;

function inviteCopy(data: InviteEmailData): {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  footer?: string;
} {
  const batchLine = data.batchName ? ` Batch: ${data.batchName}.` : '';
  return {
    subject: `You're invited to SMART — ${data.institutionName}`,
    heading: 'You have a new invitation',
    body: `Hello ${data.fullName}, you have been invited to join ${data.institutionName} on SMART.${batchLine}`,
    cta: 'Set your password and sign in',
    footer: 'This invitation link expires in 7 days.',
  };
}

function formatStage(stage: string): string {
  return stage
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  data: EmailTemplateData,
): RenderedEmail {
  switch (template) {
    case 'institution-admin-invite': {
      const invite = data as InviteEmailData;
      const copy = {
        subject: `You're invited to manage ${invite.institutionName} on SMART`,
        heading: 'Institution admin invitation',
        body: `Hello ${invite.fullName}, you have been invited as an institution admin for ${invite.institutionName}.`,
        cta: 'Set your password and sign in',
        footer: 'This invitation link expires in 7 days.',
      };
      return buildInviteEmail(copy, invite, THEMES.invite);
    }
    case 'student-invite': {
      const invite = data as InviteEmailData;
      return buildInviteEmail(inviteCopy(invite), invite, THEMES.invite);
    }
    case 'invite-reminder': {
      const invite = data as InviteEmailData;
      const batchLine = invite.batchName ? ` Batch: ${invite.batchName}.` : '';
      const copy = {
        subject: 'Reminder: complete your SMART account setup',
        heading: 'Your invitation is still waiting',
        body: `Hello ${invite.fullName}, your invitation to ${invite.institutionName} is still pending.${batchLine}`,
        cta: 'Set your password',
      };
      return buildInviteEmail(copy, invite, THEMES.muted);
    }
    case 'opportunity-shortlisted': {
      const payload = data as OpportunityEmailData;
      const subject = `New opportunity: ${payload.roleTitle} at ${payload.companyName}`;
      const text = `${subject}\n\nHello ${payload.fullName},\n\nYou have been shortlisted for ${payload.roleTitle} at ${payload.companyName}.\n\nView details: ${payload.applicationsUrl}`;
      return {
        subject,
        text,
        html: renderEmailLayout({
          previewText: subject,
          heading: 'You have a new opportunity',
          accentColor: THEMES.opportunity.accent,
          accentSoftColor: THEMES.opportunity.soft,
          bodyHtml: [
            paragraph(`Hello ${strong(payload.fullName)},`),
            paragraph(
              `Great news — you have been shortlisted for ${strong(payload.roleTitle)} at ${strong(payload.companyName)}.`,
            ),
            bulletList([
              'Review the role details in your applications dashboard.',
              'Prepare for the next stage if your placement office moves you forward.',
            ]),
          ].join(''),
          cta: { label: 'View my applications', url: payload.applicationsUrl },
        }),
      };
    }
    case 'application-stage-changed': {
      const payload = data as StageChangeEmailData;
      const fromLabel = payload.fromStage ? formatStage(payload.fromStage) : 'Applied';
      const toLabel = formatStage(payload.toStage);
      const subject = `Application update: ${payload.roleTitle} at ${payload.companyName}`;
      const text = `${subject}\n\nHello ${payload.fullName},\n\nYour application moved from ${fromLabel} to ${toLabel}.\n\nView details: ${payload.applicationsUrl}`;
      return {
        subject,
        text,
        html: renderEmailLayout({
          previewText: subject,
          heading: 'Application status updated',
          accentColor: THEMES.stage.accent,
          accentSoftColor: THEMES.stage.soft,
          bodyHtml: [
            paragraph(`Hello ${strong(payload.fullName)},`),
            paragraph(
              `Your application for ${strong(payload.roleTitle)} at ${strong(payload.companyName)} moved from ${strong(fromLabel)} to ${strong(toLabel)}.`,
            ),
          ].join(''),
          cta: { label: 'Open applications', url: payload.applicationsUrl },
        }),
      };
    }
    case 'verification-passed': {
      const payload = data as VerificationEmailData;
      const subject = `Skill verified: ${payload.skillName}`;
      return buildVerificationEmail(payload, subject, THEMES.success, 'Verification complete');
    }
    case 'verification-failed': {
      const payload = data as VerificationEmailData;
      const subject = `Skill verification update: ${payload.skillName}`;
      return buildVerificationEmail(payload, subject, THEMES.danger, 'Verification result');
    }
    case 'verification-locked': {
      const payload = data as VerificationEmailData;
      const subject = `Skill locked: ${payload.skillName}`;
      return buildVerificationEmail(payload, subject, THEMES.stage, 'Skill temporarily locked');
    }
    case 'work-experience-verifier-invite': {
      const payload = data as WorkExperienceVerifierInviteEmailData;
      const subject = `Work Experience Verification Request for ${payload.candidateName} at ${payload.companyName}`;
      const text = `${subject}\n\nHello ${payload.verifierName},\n\n${payload.candidateName} has listed work experience at ${payload.companyName} as ${payload.roleTitle} (${payload.startDate} - ${payload.endDate}) on the SMART platform and listed you as the verifier.\n\nPlease verify or reject this claim using the link below:\n${payload.verificationUrl}\n\nNote: This link will expire in ${payload.expiresAtFormatted}.`;
      return {
        subject,
        text,
        html: renderEmailLayout({
          previewText: subject,
          heading: 'Work Experience Verification Request',
          accentColor: THEMES.invite.accent,
          accentSoftColor: THEMES.invite.soft,
          bodyHtml: [
            paragraph(`Hello ${strong(payload.verifierName)},`),
            paragraph(
              `${strong(payload.candidateName)} has submitted a work experience entry for ${strong(payload.roleTitle)} at ${strong(payload.companyName)} (${payload.startDate} to ${payload.endDate}) on the SMART platform.`,
            ),
            paragraph(
              'As the designated employer contact, please click the button below to review and approve or reject this work experience claim.',
            ),
          ].join(''),
          cta: { label: 'Verify Work Experience', url: payload.verificationUrl },
          footerNote: `This verification link expires in ${payload.expiresAtFormatted}.`,
        }),
      };
    }
    case 'work-experience-verifier-reminder': {
      const payload = data as WorkExperienceVerifierReminderEmailData;
      const subject = `Reminder: Work Experience Verification Request for ${payload.candidateName}`;
      const text = `${subject}\n\nHello ${payload.verifierName},\n\nThis is a reminder to verify the work experience claim for ${payload.candidateName} at ${payload.companyName} as ${payload.roleTitle}.\n\nPlease complete verification using the link below:\n${payload.verificationUrl}\n\nNote: This link will expire soon.`;
      return {
        subject,
        text,
        html: renderEmailLayout({
          previewText: subject,
          heading: 'Verification Request Pending',
          accentColor: THEMES.stage.accent,
          accentSoftColor: THEMES.stage.soft,
          bodyHtml: [
            paragraph(`Hello ${strong(payload.verifierName)},`),
            paragraph(
              `This is a friendly reminder to verify the work experience claim for ${strong(payload.candidateName)} at ${strong(payload.companyName)} (${strong(payload.roleTitle)}).`,
            ),
          ].join(''),
          cta: { label: 'Complete Verification', url: payload.verificationUrl },
          footerNote: `This verification link will expire in ${payload.expiresAtFormatted}.`,
        }),
      };
    }
  }
}

function buildInviteEmail(
  copy: { subject: string; heading: string; body: string; cta: string; footer?: string },
  data: InviteEmailData,
  theme: { accent: string; soft: string },
): RenderedEmail {
  return {
    subject: copy.subject,
    text: `${copy.body}\n\n${copy.cta}: ${data.inviteUrl}${copy.footer ? `\n\n${copy.footer}` : ''}`,
    html: renderEmailLayout({
      previewText: copy.subject,
      heading: copy.heading,
      accentColor: theme.accent,
      accentSoftColor: theme.soft,
      bodyHtml: paragraph(copy.body),
      cta: { label: copy.cta, url: data.inviteUrl },
      footerNote: copy.footer,
    }),
  };
}

function buildVerificationEmail(
  payload: VerificationEmailData,
  subject: string,
  theme: { accent: string; soft: string },
  heading: string,
): RenderedEmail {
  const text = `${subject}\n\nHello ${payload.fullName},\n\n${payload.skillName}: ${payload.statusLabel}\n${payload.detail}\n\nView profile: ${payload.profileUrl}`;
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading,
      accentColor: theme.accent,
      accentSoftColor: theme.soft,
      bodyHtml: [
        paragraph(`Hello ${strong(payload.fullName)},`),
        paragraph(`${strong(payload.skillName)} — ${strong(payload.statusLabel)}`),
        paragraph(payload.detail),
      ].join(''),
      cta: { label: 'View my profile', url: payload.profileUrl },
    }),
  };
}
