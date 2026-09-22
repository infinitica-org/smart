import {
  renderEmailLayout,
  paragraph,
  strong,
  detailRows,
  WELCOME_ILLUSTRATION,
  REMINDER_ILLUSTRATION,
  ADMIN_ILLUSTRATION,
  SHORTLISTED_ILLUSTRATION,
  STAGE_CHANGED_ILLUSTRATION,
  VERIFICATION_PASSED_ILLUSTRATION,
  VERIFICATION_FAILED_ILLUSTRATION,
  VERIFICATION_LOCKED_ILLUSTRATION,
  WORK_EXPERIENCE_ILLUSTRATION,
} from './email-layout.js';
import { env } from '../config/env.js';
import type {
  CertificateEndorsementRequestEmailData,
  CompanyOnboardingEmailVerifyData,
  EmailTemplateData,
  EmailTemplateName,
  InviteEmailData,
  OpportunityEmailData,
  StageChangeEmailData,
  VerificationEmailData,
  WorkExperienceVerifierInviteEmailData,
  WorkExperienceVerifierReminderEmailData,
  WorkExperienceManagerEndorsementEmailData,
} from './mailer.types.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SIGNOFF_STUDY_BUDDY = '— Your study buddy at SMART';
const SIGNOFF_TEAM = '— The SMART Team';

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

/** CO-T05: per-stage badge tone so the offer/hired/rejected emails read distinctly, not identically. */
const STAGE_EMAIL_TONE: Partial<Record<string, 'success' | 'warning' | 'danger'>> = {
  OFFER: 'success',
  HIRED: 'success',
  REJECTED: 'danger',
};

/** CO-T05: one extra line of stage-specific context appended to the generic move copy. */
const STAGE_EMAIL_NOTE: Partial<Record<string, string>> = {
  AI_VERIFIED: 'Your profile has passed AI verification and is now visible to the company.',
  OFFER: 'Congratulations on the offer — review the details with your placement office.',
  HIRED: "Congratulations — you've been hired! Wishing you all the best in the new role.",
  REJECTED:
    "This one didn't work out, but your placement office can help you find the next opening.",
};

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
    case 'institution-admin-invite':
      return buildInstitutionAdminInvite(data as InviteEmailData);
    case 'platform-admin-invite':
      return buildPlatformAdminInvite(data as InviteEmailData);
    case 'student-invite':
      return buildStudentInvite(data as InviteEmailData);
    case 'invite-reminder':
      return buildInviteReminder(data as InviteEmailData);
    case 'opportunity-shortlisted':
      return buildOpportunityShortlisted(data as OpportunityEmailData);
    case 'application-stage-changed':
      return buildStageChanged(data as StageChangeEmailData);
    case 'verification-passed':
      return buildVerificationPassed(data as VerificationEmailData);
    case 'verification-failed':
      return buildVerificationFailed(data as VerificationEmailData);
    case 'verification-locked':
      return buildVerificationLocked(data as VerificationEmailData);
    case 'work-experience-verifier-invite':
      return buildWorkExperienceVerifierInvite(data as WorkExperienceVerifierInviteEmailData);
    case 'work-experience-verifier-reminder':
      return buildWorkExperienceVerifierReminder(data as WorkExperienceVerifierReminderEmailData);
    case 'certificate-endorsement-request':
      return buildCertificateEndorsementRequest(data as CertificateEndorsementRequestEmailData);
    case 'work-experience-manager-invite':
      return buildWorkExperienceManagerInvite(data as WorkExperienceManagerEndorsementEmailData);
    case 'work-experience-manager-reminder':
      return buildWorkExperienceManagerReminder(data as WorkExperienceManagerEndorsementEmailData);
    case 'company-portal-invite':
      return buildCompanyPortalInvite(data as InviteEmailData);
    case 'company-onboarding-email-verify':
      return buildCompanyOnboardingEmailVerify(data as CompanyOnboardingEmailVerifyData);
  }
}

function buildCompanyOnboardingEmailVerify(
  payload: CompanyOnboardingEmailVerifyData,
): RenderedEmail {
  const subject = 'Verify your email for SMART company registration';
  const bodyHtml = [
    paragraph(`Hello ${strong(payload.fullName)}, use this code to verify your work email:`),
    paragraph(strong(payload.verificationCode)),
    paragraph(`This code expires at ${payload.expiresAtFormatted} (UTC).`),
  ].join('');
  const text = [
    `Hello ${payload.fullName}, your SMART company registration verification code is ${payload.verificationCode}.`,
    `It expires at ${payload.expiresAtFormatted} (UTC).`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: 'Verify your work email',
      bodyHtml,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- institution-admin-invite (TPO / placement staff) ---------------- */

function buildInstitutionAdminInvite(invite: InviteEmailData): RenderedEmail {
  const subject = `You're invited to manage ${invite.institutionName} on SMART`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(invite.fullName)}, ${invite.institutionName} has added you as a placement officer on SMART — the platform your students already use to track verified skills and job readiness.`,
    ),
    paragraph(
      `As an admin, you'll be able to invite students in bulk, see batch-wide readiness at a glance, review shortlists as recruiters make them, and keep placement records in one place instead of scattered spreadsheets.`,
    ),
    paragraph(
      `Setting up your account takes less than two minutes — just confirm a password and you're in.`,
    ),
    detailRows([['Institution', invite.institutionName]]),
  ].join('');
  const text = [
    `Hello ${invite.fullName}, ${invite.institutionName} has added you as a placement officer on SMART.`,
    `As an admin, you'll be able to invite students in bulk, see batch-wide readiness, review shortlists, and keep placement records in one place.`,
    `Set up my account: ${invite.inviteUrl}`,
    `This link is valid for ${env.INVITATION_TTL_DAYS} days.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: 'Set up your placement admin account',
      illustration: ADMIN_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Set up my account', url: invite.inviteUrl },
      footerNote: `This link is valid for ${env.INVITATION_TTL_DAYS} days, so it's worth doing now rather than later.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- company-portal-invite (COMPANY) ---------------- */

function buildCompanyPortalInvite(invite: InviteEmailData): RenderedEmail {
  const companyName = invite.institutionName;
  const subject = `Set up your ${companyName} account on SMART`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(invite.fullName)}, ${strong(companyName)} has been approved on SMART. You can now set a password for your company portal account.`,
    ),
    paragraph(
      `Use the button below to choose a password. Once signed in, your company tenant context is tied to your account — never share your credentials.`,
    ),
  ].join('');
  const text = [
    `Hello ${invite.fullName}, ${companyName} has been approved on SMART.`,
    `Set up your password: ${invite.inviteUrl}`,
    `This link is valid for ${env.INVITATION_TTL_DAYS} days.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: 'Activate your company account',
      illustration: ADMIN_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Set my password', url: invite.inviteUrl },
      footerNote: `This link is valid for ${env.INVITATION_TTL_DAYS} days.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- platform-admin-invite (SUPER_ADMIN) ---------------- */

function buildPlatformAdminInvite(invite: InviteEmailData): RenderedEmail {
  const subject = "You're invited to become a SMART platform admin";
  const bodyHtml = [
    paragraph(
      `Hello ${strong(invite.fullName)}, you've been granted ${strong('platform admin')} access on SMART — full administrative control across every institution and company on the platform.`,
    ),
    paragraph(
      `As a platform admin, you can manage tenants, resolve verification decisions, review integrity flags, and — like this invitation — grant platform-admin access to others. Every sensitive action you take is recorded in the audit log with your name and reason.`,
    ),
    paragraph(
      `Setting up your account takes less than two minutes — just confirm a password and you're in.`,
    ),
  ].join('');
  const text = [
    `Hello ${invite.fullName}, you've been granted platform admin access on SMART — full administrative control across every institution and company on the platform.`,
    `As a platform admin, you can manage tenants, resolve verification decisions, review integrity flags, and grant platform-admin access to others. Every sensitive action is recorded in the audit log with your name and reason.`,
    `Set up my account: ${invite.inviteUrl}`,
    `This link is valid for ${env.INVITATION_TTL_DAYS} days.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: 'Set up your platform admin account',
      illustration: ADMIN_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Set up my account', url: invite.inviteUrl },
      footerNote: `This link is valid for ${env.INVITATION_TTL_DAYS} days, so it's worth doing now rather than later. If you weren't expecting this, contact an existing platform admin before continuing.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- student-invite ---------------- */

function buildStudentInvite(invite: InviteEmailData): RenderedEmail {
  const name = firstName(invite.fullName);
  const batchSuffix = invite.batchName ? ` for ${invite.batchName}` : '';
  const subject = `${invite.institutionName} invited you to SMART — let's get your skills verified`;
  const rows: Array<[string, string]> = [['Institution', invite.institutionName]];
  if (invite.batchName) rows.push(['Batch', invite.batchName]);

  const bodyHtml = [
    paragraph(`Hi ${strong(name)},`),
    paragraph(
      `${invite.institutionName} just added you to SMART${batchSuffix}. Think of it as your study buddy for placement season — it keeps track of the skills you're building, shows you exactly what recruiters are looking for, and does the bragging for you once a skill is verified.`,
    ),
    paragraph(
      `Here's the honest version: the students who get shortlisted fastest usually aren't the ones with the longest resume — they're the ones with a few verified skills on their profile. Setting yours up takes one step.`,
    ),
    detailRows(rows),
  ].join('');
  const text = [
    `Hi ${name}, ${invite.institutionName} just added you to SMART${batchSuffix}.`,
    `It keeps track of the skills you're building, shows you what recruiters are looking for, and verifies your skills so you don't have to just claim them.`,
    `Set my password: ${invite.inviteUrl}`,
    `This link is valid for ${env.INVITATION_TTL_DAYS} days.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: `Welcome to SMART, ${name}`,
      illustration: WELCOME_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Set my password', url: invite.inviteUrl },
      footerNote: `This link is valid for ${env.INVITATION_TTL_DAYS} days.`,
      signoff: SIGNOFF_STUDY_BUDDY,
    }),
  };
}

/* ---------------- invite-reminder ---------------- */

function buildInviteReminder(invite: InviteEmailData): RenderedEmail {
  const name = firstName(invite.fullName);
  const batchSuffix = invite.batchName ? ` (${invite.batchName})` : '';
  const subject = 'Still there? Your SMART invite is waiting';
  const bodyHtml = [
    paragraph(`Hi ${strong(name)},`),
    paragraph(
      `Just checking in — your invite to join ${invite.institutionName} on SMART${batchSuffix} is still sitting unopened.`,
    ),
    paragraph(
      `No pressure, but this is probably the easiest five minutes you'll spend all week: set a password, and you're already ahead of classmates who haven't started building a verified profile yet.`,
    ),
  ].join('');
  const text = [
    `Hi ${name}, your invite to join ${invite.institutionName} on SMART${batchSuffix} is still pending.`,
    `Set your password: ${invite.inviteUrl}`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: 'A quick nudge from your study buddy',
      illustration: REMINDER_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Finish setting up', url: invite.inviteUrl },
      footerNote: "This invite link is still active, but it won't be forever — best to use it now.",
      signoff: SIGNOFF_STUDY_BUDDY,
    }),
  };
}

/* ---------------- opportunity-shortlisted ---------------- */

function buildOpportunityShortlisted(payload: OpportunityEmailData): RenderedEmail {
  const name = firstName(payload.fullName);
  const subject = `You're shortlisted for ${payload.roleTitle} at ${payload.companyName}`;
  const bodyHtml = [
    paragraph(`Hi ${strong(name)},`),
    paragraph(
      `${payload.companyName} reviewed your verified profile and shortlisted you for ${strong(payload.roleTitle)}. That's not a small thing — it means your skills held up against everyone else who applied.`,
    ),
    paragraph(
      `Take a few minutes to reread the role details, skim ${payload.companyName}'s recent work, and jot down two or three things from your projects you'd want to talk through if this moves to an interview.`,
    ),
    detailRows([
      ['Company', payload.companyName],
      ['Role', payload.roleTitle],
    ]),
  ].join('');
  const text = [
    `Hi ${name}, ${payload.companyName} shortlisted you for ${payload.roleTitle}.`,
    `View your applications: ${payload.applicationsUrl}`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: "Nice one — you're shortlisted",
      illustration: SHORTLISTED_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'View my applications', url: payload.applicationsUrl },
      badge: { label: 'Shortlisted', tone: 'info' },
      signoff: SIGNOFF_STUDY_BUDDY,
    }),
  };
}

/* ---------------- application-stage-changed ---------------- */

function buildStageChanged(payload: StageChangeEmailData): RenderedEmail {
  const name = firstName(payload.fullName);
  const fromLabel = payload.fromStage ? formatStage(payload.fromStage) : 'Applied';
  const toLabel = formatStage(payload.toStage);
  const tone = STAGE_EMAIL_TONE[payload.toStage] ?? 'warning';
  const extraLine = STAGE_EMAIL_NOTE[payload.toStage];
  const subject = `Update on your ${payload.roleTitle} application`;
  const bodyHtml = [
    paragraph(`Hi ${strong(name)},`),
    paragraph(
      `${payload.companyName} moved your application for ${strong(payload.roleTitle)} from ${fromLabel} to ${strong(toLabel)}. Progress like this usually means they liked what they saw — keep the momentum going.`,
    ),
    paragraph(
      extraLine ??
        `If ${toLabel} involves an interview or assessment, now's a good moment to revisit the skills you got verified for this role and think through how you'd explain them out loud.`,
    ),
    detailRows([
      ['Company', payload.companyName],
      ['Stage', toLabel],
    ]),
  ].join('');
  const text = [
    `Hi ${name}, your application for ${payload.roleTitle} at ${payload.companyName} moved from ${fromLabel} to ${toLabel}.`,
    extraLine ?? null,
    `View your application: ${payload.applicationsUrl}`,
  ]
    .filter((line) => line !== null)
    .join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: `Your application just moved to ${toLabel}`,
      illustration: STAGE_CHANGED_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Open my application', url: payload.applicationsUrl },
      badge: { label: toLabel, tone },
      signoff: SIGNOFF_STUDY_BUDDY,
    }),
  };
}

/* ---------------- verification-passed / failed / locked ---------------- */

function buildVerificationPassed(payload: VerificationEmailData): RenderedEmail {
  return buildVerificationEmail(payload, {
    subject: `Skill verified: ${payload.skillName}`,
    heading: `You're verified in ${payload.skillName}`,
    tone: 'success',
    illustration: VERIFICATION_PASSED_ILLUSTRATION,
    extra: `This isn't just a badge — recruiters searching SMART for ${payload.skillName} will now see your profile as verified, which puts you ahead of candidates who only self-reported the same skill.`,
  });
}

function buildVerificationFailed(payload: VerificationEmailData): RenderedEmail {
  return buildVerificationEmail(payload, {
    subject: `Skill verification update: ${payload.skillName}`,
    heading: "Not this attempt — here's the plan",
    tone: 'danger',
    illustration: VERIFICATION_FAILED_ILLUSTRATION,
    extra: `One miss isn't the story here — plenty of verified profiles took two tries. Use the time before your next attempt to go through the specific areas the assessment flagged, rather than re-reading everything from scratch.`,
  });
}

function buildVerificationLocked(payload: VerificationEmailData): RenderedEmail {
  return buildVerificationEmail(payload, {
    subject: `Skill locked: ${payload.skillName}`,
    heading: `${payload.skillName} needs a short cooldown`,
    tone: 'warning',
    illustration: VERIFICATION_LOCKED_ILLUSTRATION,
    extra: `This is a standard safeguard, not a mark against you — it exists so verification results stay meaningful for everyone. Use the time before it reopens to review the material properly instead of attempting it cold again.`,
  });
}

function buildVerificationEmail(
  payload: VerificationEmailData,
  copy: {
    subject: string;
    heading: string;
    tone: 'success' | 'warning' | 'danger';
    illustration: string;
    extra: string;
  },
): RenderedEmail {
  const name = firstName(payload.fullName);
  const bodyHtml = [
    paragraph(`Hi ${strong(name)},`),
    paragraph(payload.detail),
    paragraph(copy.extra),
    detailRows([
      ['Skill', payload.skillName],
      ['Status', payload.statusLabel],
    ]),
  ].join('');
  const text = [
    `Hi ${name}, ${payload.skillName}: ${payload.statusLabel}.`,
    payload.detail,
    copy.extra,
    `View my profile: ${payload.profileUrl}`,
  ].join('\n\n');
  return {
    subject: copy.subject,
    text,
    html: renderEmailLayout({
      previewText: copy.subject,
      heading: copy.heading,
      illustration: copy.illustration,
      bodyHtml,
      cta: { label: 'View my profile', url: payload.profileUrl },
      badge: { label: payload.statusLabel, tone: copy.tone },
      signoff: SIGNOFF_STUDY_BUDDY,
    }),
  };
}

/* ---------------- work-experience-verifier-invite / reminder ----------------
 * Sent to an external employer contact (not a student or TPO) asking them to
 * confirm a candidate's claimed work experience, so the tone stays formal —
 * no "study buddy" voice for someone who has no existing relationship with
 * SMART. ------------------------------------------------------------------- */

function buildWorkExperienceVerifierInvite(
  payload: WorkExperienceVerifierInviteEmailData,
): RenderedEmail {
  const verifierName = payload.verifierName || 'Hiring Manager / HR';
  const subject = `Work experience verification request — ${payload.candidateName} at ${payload.companyName}`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(verifierName)}, ${strong(payload.candidateName)} has listed ${strong(payload.roleTitle)} at ${strong(payload.companyName)} (${payload.startDate} – ${payload.endDate}) as part of their verified profile on SMART, a skills and placement platform used by their institution. You've been named as the point of contact who can confirm this.`,
    ),
    paragraph(
      `Confirming takes under a minute — review the details below and approve or reject the claim using the secure link.`,
    ),
    detailRows([
      ['Candidate', payload.candidateName],
      ['Role', payload.roleTitle],
      ['Company', payload.companyName],
      ['Duration', `${payload.startDate} – ${payload.endDate}`],
    ]),
  ].join('');
  const text = [
    `Hello ${verifierName}, ${payload.candidateName} has listed ${payload.roleTitle} at ${payload.companyName} (${payload.startDate} to ${payload.endDate}) on the SMART platform and named you as the verifier.`,
    `Review this request: ${payload.verificationUrl}`,
    `This link expires in ${payload.expiresAtFormatted}.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: `Verify ${payload.candidateName}'s work experience`,
      illustration: WORK_EXPERIENCE_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Review this request', url: payload.verificationUrl },
      footerNote: `This link expires in ${payload.expiresAtFormatted}.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

function buildWorkExperienceVerifierReminder(
  payload: WorkExperienceVerifierReminderEmailData,
): RenderedEmail {
  const verifierName = payload.verifierName || 'Hiring Manager / HR';
  const subject = `Reminder: verification request for ${payload.candidateName}`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(verifierName)}, this is a follow-up on the work experience verification request for ${strong(payload.candidateName)}'s time as ${strong(payload.roleTitle)} at ${strong(payload.companyName)}. We haven't heard back yet.`,
    ),
    paragraph(`If you're able, confirming only takes a minute using the secure link below.`),
    detailRows([
      ['Candidate', payload.candidateName],
      ['Role', payload.roleTitle],
      ['Company', payload.companyName],
    ]),
  ].join('');
  const text = [
    `Hello ${verifierName}, this is a reminder to verify ${payload.candidateName}'s work experience as ${payload.roleTitle} at ${payload.companyName}.`,
    `Review this request: ${payload.verificationUrl}`,
    `This link expires in ${payload.expiresAtFormatted}.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: 'Still waiting on your confirmation',
      illustration: WORK_EXPERIENCE_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Review this request', url: payload.verificationUrl },
      footerNote: `This link expires in ${payload.expiresAtFormatted}.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- certificate-endorsement-request ----------------
 * Sent to a named endorser (may be external, e.g. an instructor or manager)
 * asking them to vouch for a candidate's certificate — formal tone, same as
 * the work-experience verifier emails. --------------------------------- */

function buildCertificateEndorsementRequest(
  payload: CertificateEndorsementRequestEmailData,
): RenderedEmail {
  const subject = `${payload.candidateName} asked you to endorse a certificate on SMART`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(payload.endorserName)}, ${strong(payload.candidateName)} has asked you to endorse their certificate ${strong(payload.certificateTitle)} (issued by ${strong(payload.certificateIssuer)}) on SMART, a skills and placement platform.`,
    ),
    paragraph(
      'Reviewing takes under a minute — check the certificate details below and approve or reject the endorsement using the secure link.',
    ),
    detailRows([
      ['Candidate', payload.candidateName],
      ['Certificate', payload.certificateTitle],
      ['Issuer', payload.certificateIssuer],
    ]),
  ].join('');
  const text = [
    `Hello ${payload.endorserName}, ${payload.candidateName} has asked you to endorse their certificate "${payload.certificateTitle}" (issued by ${payload.certificateIssuer}) on SMART.`,
    `Review this request: ${payload.endorsementUrl}`,
    `This link expires in ${payload.expiresAtFormatted}.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: `Endorse ${payload.candidateName}'s certificate`,
      illustration: SHORTLISTED_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Review this request', url: payload.endorsementUrl },
      footerNote: `This endorsement link expires in ${payload.expiresAtFormatted}.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- work-experience-manager-invite (WE-T03) ---------------- */

function buildWorkExperienceManagerInvite(
  payload: WorkExperienceManagerEndorsementEmailData,
): RenderedEmail {
  const subject = `Endorsement Request: Confirm work experience & skills for ${payload.candidateName}`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(payload.managerName)}, ${strong(payload.candidateName)} has listed you as their manager for their role as ${strong(payload.roleTitle)} at ${strong(payload.companyName)} on SMART, a verified skills platform.`,
    ),
    paragraph(
      'Please confirm their employment dates and optionally rate the skills they demonstrated. This endorsement helps validate their professional profile.',
    ),
    detailRows([
      ['Candidate', payload.candidateName],
      ['Company', payload.companyName],
      ['Role Title', payload.roleTitle],
      ['Start Date', payload.startDate],
      ['End Date', payload.endDate],
    ]),
  ].join('');
  const text = [
    `Hello ${payload.managerName}, ${payload.candidateName} has listed you as their manager for their role as ${payload.roleTitle} at ${payload.companyName} on SMART.`,
    `Please confirm their employment and skills using the secure survey link: ${payload.surveyUrl}`,
    `This link is valid for ${payload.expiresAtFormatted}.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: `Work Experience Endorsement for ${payload.candidateName}`,
      illustration: WORK_EXPERIENCE_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Complete Endorsement Survey', url: payload.surveyUrl },
      footerNote: `This magic link expires in ${payload.expiresAtFormatted}.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}

/* ---------------- work-experience-manager-reminder (WE-T03) ---------------- */

function buildWorkExperienceManagerReminder(
  payload: WorkExperienceManagerEndorsementEmailData,
): RenderedEmail {
  const subject = `Reminder: Endorsement request for ${payload.candidateName} expires soon`;
  const bodyHtml = [
    paragraph(
      `Hello ${strong(payload.managerName)}, this is a friendly reminder to review and endorse ${strong(payload.candidateName)}'s work experience as ${strong(payload.roleTitle)} at ${strong(payload.companyName)}.`,
    ),
    paragraph('It takes under 2 minutes to confirm their role and rate their key skills.'),
    detailRows([
      ['Candidate', payload.candidateName],
      ['Company', payload.companyName],
      ['Role Title', payload.roleTitle],
    ]),
  ].join('');
  const text = [
    `Hello ${payload.managerName}, friendly reminder to endorse ${payload.candidateName}'s work experience at ${payload.companyName}.`,
    `Survey link: ${payload.surveyUrl}`,
    `This link expires in ${payload.expiresAtFormatted}.`,
  ].join('\n\n');
  return {
    subject,
    text,
    html: renderEmailLayout({
      previewText: subject,
      heading: `Reminder: Manager Endorsement for ${payload.candidateName}`,
      illustration: WORK_EXPERIENCE_ILLUSTRATION,
      bodyHtml,
      cta: { label: 'Complete Endorsement Survey', url: payload.surveyUrl },
      footerNote: `This link expires in ${payload.expiresAtFormatted}.`,
      signoff: SIGNOFF_TEAM,
    }),
  };
}
