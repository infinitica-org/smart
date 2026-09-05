// Sample data + per-theme copy for the 8 transactional emails SMART already sends
// (apps/api-core/src/platform/mailer/mailer.types.ts EmailTemplateName union).
// Same underlying data across all three themes per template, so the gallery is an
// apples-to-apples comparison of presentation + tone, not different scenarios.

const SAMPLE = {
  tpoInvite: {
    fullName: 'Ritika Menon',
    institutionName: 'Bansal Institute of Technology',
    role: 'Placement Officer · Full admin access',
    inviteUrl: 'https://auth.smart.app/invite/inst_8f3a1c29',
    expires: '10 Sept 2026',
  },
  studentInvite: {
    fullName: 'Aarav Sharma',
    institutionName: 'Bansal Institute of Technology',
    batchName: 'B.Tech CSE · Batch of 2026',
    inviteUrl: 'https://auth.smart.app/invite/std_71bd4e02',
    expires: '10 Sept 2026',
  },
  reminder: {
    fullName: 'Aarav Sharma',
    institutionName: 'Bansal Institute of Technology',
    batchName: 'B.Tech CSE · Batch of 2026',
    inviteUrl: 'https://auth.smart.app/invite/std_71bd4e02',
    daysLeft: '3 days',
  },
  opportunity: {
    fullName: 'Aarav Sharma',
    companyName: 'Nimbus Robotics',
    roleTitle: 'Graduate Software Engineer',
    applicationsUrl: 'https://app.smart.app/applications',
  },
  stage: {
    fullName: 'Aarav Sharma',
    companyName: 'Nimbus Robotics',
    roleTitle: 'Graduate Software Engineer',
    fromLabel: 'Applied',
    toLabel: 'Interview Scheduled',
    applicationsUrl: 'https://app.smart.app/applications',
  },
  verifyPassed: {
    fullName: 'Aarav Sharma',
    skillName: 'Data Structures & Algorithms',
    detail:
      'You scored in the top tier — this skill is now visible as verified on your public profile.',
    profileUrl: 'https://app.smart.app/profile',
  },
  verifyFailed: {
    fullName: 'Aarav Sharma',
    skillName: 'System Design Fundamentals',
    detail:
      'You can retake this verification after 14 days. Review the focus areas in your prep guide first.',
    profileUrl: 'https://app.smart.app/profile',
  },
  verifyLocked: {
    fullName: 'Aarav Sharma',
    skillName: 'Advanced SQL',
    detail: 'Too many attempts were made in a short window, so this skill is temporarily locked.',
    profileUrl: 'https://app.smart.app/profile',
    unlockDate: '12 Sept 2026',
  },
};

const s = SAMPLE;

export const CONTENT = {
  /* ---------------- institution-admin-invite (TPO) ---------------- */
  'institution-admin-invite': {
    classic: {
      subject: `Invitation to administer ${s.tpoInvite.institutionName} on ${'SMART'}`,
      previewText: `You have been invited as a placement officer for ${s.tpoInvite.institutionName}.`,
      heading: 'Institution Administrator Invitation',
      salutation: `Dear ${s.tpoInvite.fullName},`,
      paragraphs: [
        `You have been formally invited to administer <strong>${s.tpoInvite.institutionName}</strong>'s placement operations on the SMART platform.`,
        `Please use the secure link below to set your password and activate your administrator account.`,
      ],
      infoRows: [
        ['Institution', s.tpoInvite.institutionName],
        ['Access level', s.tpoInvite.role],
        ['Link valid until', s.tpoInvite.expires],
      ],
      cta: { label: 'Activate administrator account', url: s.tpoInvite.inviteUrl },
      footerNote: 'For security, this link can only be used once and expires after 7 days.',
    },
    minimal: {
      subject: `You're invited to manage ${s.tpoInvite.institutionName} on SMART`,
      previewText: `Set up your placement officer account for ${s.tpoInvite.institutionName}.`,
      heading: 'Set up your placement admin account',
      salutation: `Hi ${s.tpoInvite.fullName},`,
      paragraphs: [
        `${s.tpoInvite.institutionName} has added you as a placement officer on SMART — the platform your students already use to track verified skills and job readiness.`,
        `As an admin, you'll be able to invite students in bulk, see batch-wide readiness at a glance, review shortlists as recruiters make them, and keep placement records in one place instead of scattered spreadsheets.`,
        `Setting up your account takes less than two minutes — just confirm a password and you're in.`,
      ],
      infoRows: [
        ['Institution', s.tpoInvite.institutionName],
        ['Access', s.tpoInvite.role],
      ],
      cta: { label: 'Set up my account', url: s.tpoInvite.inviteUrl },
      footerNote: `This link expires on ${s.tpoInvite.expires}, so it's worth doing now rather than later.`,
      signoff: '— The SMART Team',
    },
    genz: {
      subject: `🎉 You're the new placement admin for ${s.tpoInvite.institutionName}`,
      previewText: `Welcome aboard — set your password to unlock your admin dashboard.`,
      emoji: '👋',
      heading: `Welcome to SMART, ${s.tpoInvite.fullName.split(' ')[0]}!`,
      salutation: `Hey ${s.tpoInvite.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.tpoInvite.institutionName} just brought you on as a placement admin — nice! You're one click away from your dashboard.`,
      ],
      infoRows: [
        ['Institution', s.tpoInvite.institutionName],
        ['Access', 'Full admin'],
      ],
      cta: { label: 'Claim my account', url: s.tpoInvite.inviteUrl },
      footerNote: `Heads up — this invite link expires ${s.tpoInvite.expires}.`,
    },
  },

  /* ---------------- student-invite ---------------- */
  'student-invite': {
    classic: {
      subject: `You're invited to SMART — ${s.studentInvite.institutionName}`,
      previewText: `Activate your student account for ${s.studentInvite.institutionName}.`,
      heading: 'Student Account Invitation',
      salutation: `Dear ${s.studentInvite.fullName},`,
      paragraphs: [
        `You have been invited to join <strong>${s.studentInvite.institutionName}</strong> on the SMART platform as part of ${s.studentInvite.batchName}.`,
        `Please set your password using the secure link below to complete your registration.`,
      ],
      infoRows: [
        ['Institution', s.studentInvite.institutionName],
        ['Batch', s.studentInvite.batchName],
        ['Link valid until', s.studentInvite.expires],
      ],
      cta: { label: 'Set your password and sign in', url: s.studentInvite.inviteUrl },
      footerNote: 'This invitation link expires in 7 days.',
    },
    minimal: {
      subject: `${s.studentInvite.institutionName} invited you to SMART — let's get your skills verified`,
      previewText: `Set your password and start building your verified profile.`,
      heading: `Welcome to SMART, ${s.studentInvite.fullName.split(' ')[0]}`,
      salutation: `Hi ${s.studentInvite.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.studentInvite.institutionName} just added you to SMART for ${s.studentInvite.batchName}. Think of it as your study buddy for placement season — it keeps track of the skills you're building, shows you exactly what recruiters are looking for, and does the bragging for you once a skill is verified.`,
        `Here's the honest version: the students who get shortlisted fastest usually aren't the ones with the longest resume — they're the ones with a few verified skills on their profile. Setting yours up takes one step.`,
      ],
      infoRows: [
        ['Institution', s.studentInvite.institutionName],
        ['Batch', s.studentInvite.batchName],
      ],
      cta: { label: 'Set my password', url: s.studentInvite.inviteUrl },
      footerNote: `Heads up — this link expires on ${s.studentInvite.expires}.`,
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `👋 Your SMART invite from ${s.studentInvite.institutionName}`,
      previewText: `Set your password and start building your verified profile.`,
      emoji: '✨',
      heading: `You're in, ${s.studentInvite.fullName.split(' ')[0]}!`,
      salutation: `Hey ${s.studentInvite.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.studentInvite.institutionName} added you to SMART for ${s.studentInvite.batchName}. Set a password and start tracking your verified skills.`,
      ],
      infoRows: [
        ['Institution', s.studentInvite.institutionName],
        ['Batch', s.studentInvite.batchName],
      ],
      cta: { label: 'Set my password', url: s.studentInvite.inviteUrl },
      footerNote: `This invite link expires ${s.studentInvite.expires} — don't sleep on it.`,
    },
  },

  /* ---------------- invite-reminder ---------------- */
  'invite-reminder': {
    classic: {
      subject: 'Reminder: complete your SMART account setup',
      previewText: `Your invitation to ${s.reminder.institutionName} is still pending.`,
      heading: 'Your Invitation Is Still Pending',
      salutation: `Dear ${s.reminder.fullName},`,
      paragraphs: [
        `Our records indicate that your invitation to join <strong>${s.reminder.institutionName}</strong> on SMART (${s.reminder.batchName}) has not yet been actioned.`,
        `Kindly complete your account setup at your earliest convenience.`,
      ],
      infoRows: [
        ['Institution', s.reminder.institutionName],
        ['Time remaining', s.reminder.daysLeft],
      ],
      cta: { label: 'Complete account setup', url: s.reminder.inviteUrl },
    },
    minimal: {
      subject: 'Still there? Your SMART invite is waiting',
      previewText: `${s.reminder.daysLeft} left to set up your account.`,
      heading: 'A quick nudge from your study buddy',
      salutation: `Hi ${s.reminder.fullName.split(' ')[0]},`,
      paragraphs: [
        `Just checking in — your invite to join ${s.reminder.institutionName} on SMART (${s.reminder.batchName}) is still sitting unopened, and it's due to expire soon.`,
        `No pressure, but this is probably the easiest five minutes you'll spend all week: set a password, and you're already ahead of classmates who haven't started building a verified profile yet.`,
      ],
      infoRows: [
        ['Institution', s.reminder.institutionName],
        ['Time left', s.reminder.daysLeft],
      ],
      cta: { label: 'Finish setting up', url: s.reminder.inviteUrl },
      footerNote: `You've got ${s.reminder.daysLeft} left before this link expires.`,
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `⏳ ${s.reminder.daysLeft} left to activate your SMART account`,
      previewText: `Don't miss out — finish setting up your account.`,
      emoji: '⏳',
      heading: 'Quick reminder for you',
      salutation: `Hey ${s.reminder.fullName.split(' ')[0]},`,
      paragraphs: [
        `Your invite to ${s.reminder.institutionName} is still sitting there unopened. ${s.reminder.daysLeft} left before it expires — let's not let that happen.`,
      ],
      infoRows: [['Time left', s.reminder.daysLeft]],
      cta: { label: 'Finish setup now', url: s.reminder.inviteUrl },
    },
  },

  /* ---------------- opportunity-shortlisted ---------------- */
  'opportunity-shortlisted': {
    classic: {
      subject: `New opportunity: ${s.opportunity.roleTitle} at ${s.opportunity.companyName}`,
      previewText: `You have been shortlisted for ${s.opportunity.roleTitle} at ${s.opportunity.companyName}.`,
      heading: 'You Have Been Shortlisted',
      salutation: `Dear ${s.opportunity.fullName},`,
      paragraphs: [
        `We are pleased to inform you that you have been shortlisted for the position of <strong>${s.opportunity.roleTitle}</strong> at <strong>${s.opportunity.companyName}</strong>.`,
        `Please review the role details in your applications dashboard and prepare for the next stage.`,
      ],
      infoRows: [
        ['Company', s.opportunity.companyName],
        ['Role', s.opportunity.roleTitle],
      ],
      cta: { label: 'View my applications', url: s.opportunity.applicationsUrl },
      badge: { label: 'Shortlisted', tone: 'info' },
    },
    minimal: {
      subject: `You're shortlisted for ${s.opportunity.roleTitle} at ${s.opportunity.companyName}`,
      previewText: `${s.opportunity.companyName} shortlisted you for ${s.opportunity.roleTitle}.`,
      heading: "Nice one — you're shortlisted",
      salutation: `Hi ${s.opportunity.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.opportunity.companyName} reviewed your verified profile and shortlisted you for ${s.opportunity.roleTitle}. That's not a small thing — it means your skills held up against everyone else who applied.`,
        `Take a few minutes to reread the role details, skim ${s.opportunity.companyName}'s recent work, and jot down two or three things from your projects you'd want to talk through if this moves to an interview.`,
      ],
      infoRows: [
        ['Company', s.opportunity.companyName],
        ['Role', s.opportunity.roleTitle],
      ],
      cta: { label: 'View my applications', url: s.opportunity.applicationsUrl },
      badge: { label: 'Shortlisted', tone: 'info' },
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `🎉 Shortlisted for ${s.opportunity.roleTitle} at ${s.opportunity.companyName}!`,
      previewText: `Big news — you made the shortlist.`,
      emoji: '🎉',
      heading: 'You made the shortlist!',
      salutation: `Hey ${s.opportunity.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.opportunity.companyName} just shortlisted you for ${s.opportunity.roleTitle}. Go check your dashboard and get ready for what's next.`,
      ],
      infoRows: [
        ['Company', s.opportunity.companyName],
        ['Role', s.opportunity.roleTitle],
      ],
      cta: { label: 'See my applications', url: s.opportunity.applicationsUrl },
      badge: { label: 'Shortlisted', tone: 'info' },
    },
  },

  /* ---------------- application-stage-changed ---------------- */
  'application-stage-changed': {
    classic: {
      subject: `Application update: ${s.stage.roleTitle} at ${s.stage.companyName}`,
      previewText: `Your application moved from ${s.stage.fromLabel} to ${s.stage.toLabel}.`,
      heading: 'Application Status Updated',
      salutation: `Dear ${s.stage.fullName},`,
      paragraphs: [
        `Your application for <strong>${s.stage.roleTitle}</strong> at <strong>${s.stage.companyName}</strong> has moved from ${s.stage.fromLabel} to <strong>${s.stage.toLabel}</strong>.`,
      ],
      infoRows: [
        ['Company', s.stage.companyName],
        ['Stage', s.stage.toLabel],
      ],
      cta: { label: 'Open applications', url: s.stage.applicationsUrl },
      badge: { label: s.stage.toLabel, tone: 'warning' },
    },
    minimal: {
      subject: `Update on your ${s.stage.roleTitle} application`,
      previewText: `Now at: ${s.stage.toLabel}.`,
      heading: `Your application just moved to ${s.stage.toLabel}`,
      salutation: `Hi ${s.stage.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.stage.companyName} moved your application for ${s.stage.roleTitle} from ${s.stage.fromLabel} to ${s.stage.toLabel}. Progress like this usually means they liked what they saw — keep the momentum going.`,
        `If ${s.stage.toLabel} involves an interview or assessment, now's a good moment to revisit the skills you got verified for this role and think through how you'd explain them out loud.`,
      ],
      infoRows: [
        ['Company', s.stage.companyName],
        ['Stage', s.stage.toLabel],
      ],
      cta: { label: 'Open my application', url: s.stage.applicationsUrl },
      badge: { label: s.stage.toLabel, tone: 'warning' },
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `📈 ${s.stage.roleTitle} update: you're at ${s.stage.toLabel}`,
      previewText: `Your application just moved forward.`,
      emoji: '📈',
      heading: 'Your application just moved!',
      salutation: `Hey ${s.stage.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.stage.companyName} moved your ${s.stage.roleTitle} application to ${s.stage.toLabel}. Keep the momentum going.`,
      ],
      infoRows: [
        ['Company', s.stage.companyName],
        ['Stage', s.stage.toLabel],
      ],
      cta: { label: 'View application', url: s.stage.applicationsUrl },
      badge: { label: s.stage.toLabel, tone: 'warning' },
    },
  },

  /* ---------------- verification-passed ---------------- */
  'verification-passed': {
    classic: {
      subject: `Skill verified: ${s.verifyPassed.skillName}`,
      previewText: `${s.verifyPassed.skillName} has been verified on your profile.`,
      heading: 'Verification Complete',
      salutation: `Dear ${s.verifyPassed.fullName},`,
      paragraphs: [
        `Your assessment for <strong>${s.verifyPassed.skillName}</strong> has been reviewed and verified.`,
        s.verifyPassed.detail,
      ],
      infoRows: [
        ['Skill', s.verifyPassed.skillName],
        ['Result', 'Verified'],
      ],
      cta: { label: 'View my profile', url: s.verifyPassed.profileUrl },
      badge: { label: 'Verified', tone: 'success' },
    },
    minimal: {
      subject: `${s.verifyPassed.skillName} is now verified on your profile`,
      previewText: `Nice work — this skill is now verified.`,
      heading: `You're verified in ${s.verifyPassed.skillName}`,
      salutation: `Hi ${s.verifyPassed.fullName.split(' ')[0]},`,
      paragraphs: [
        s.verifyPassed.detail,
        `This isn't just a badge — recruiters searching SMART for ${s.verifyPassed.skillName} will now see your profile as verified, which puts you ahead of candidates who only self-reported the same skill.`,
      ],
      infoRows: [
        ['Skill', s.verifyPassed.skillName],
        ['Result', 'Verified'],
      ],
      cta: { label: 'View my profile', url: s.verifyPassed.profileUrl },
      badge: { label: 'Verified', tone: 'success' },
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `✅ ${s.verifyPassed.skillName} — you're verified!`,
      previewText: `You passed! This skill is now verified.`,
      emoji: '✅',
      heading: 'Skill verified — nice one!',
      salutation: `Hey ${s.verifyPassed.fullName.split(' ')[0]},`,
      paragraphs: [
        `You crushed the ${s.verifyPassed.skillName} assessment. ${s.verifyPassed.detail}`,
      ],
      infoRows: [['Skill', s.verifyPassed.skillName]],
      cta: { label: 'See my profile', url: s.verifyPassed.profileUrl },
      badge: { label: 'Verified', tone: 'success' },
    },
  },

  /* ---------------- verification-failed ---------------- */
  'verification-failed': {
    classic: {
      subject: `Skill verification update: ${s.verifyFailed.skillName}`,
      previewText: `Your ${s.verifyFailed.skillName} verification was not successful this attempt.`,
      heading: 'Verification Result',
      salutation: `Dear ${s.verifyFailed.fullName},`,
      paragraphs: [
        `Your assessment for <strong>${s.verifyFailed.skillName}</strong> was reviewed and did not meet the verification threshold this attempt.`,
        s.verifyFailed.detail,
      ],
      infoRows: [
        ['Skill', s.verifyFailed.skillName],
        ['Result', 'Not verified'],
      ],
      cta: { label: 'View my profile', url: s.verifyFailed.profileUrl },
      badge: { label: 'Not verified', tone: 'danger' },
    },
    minimal: {
      subject: `${s.verifyFailed.skillName} — not verified this time`,
      previewText: `You can retake this one soon.`,
      heading: "Not this attempt — here's the plan",
      salutation: `Hi ${s.verifyFailed.fullName.split(' ')[0]},`,
      paragraphs: [
        s.verifyFailed.detail,
        `One miss isn't the story here — plenty of verified profiles took two tries. Use the time before your next attempt to go through the specific areas the assessment flagged, rather than re-reading everything from scratch.`,
      ],
      infoRows: [
        ['Skill', s.verifyFailed.skillName],
        ['Result', 'Not verified'],
      ],
      cta: { label: 'View my profile', url: s.verifyFailed.profileUrl },
      badge: { label: 'Not verified', tone: 'danger' },
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `${s.verifyFailed.skillName} — not verified yet, no stress`,
      previewText: `Not this time — here's what's next.`,
      emoji: '💪',
      heading: "Not this time — you'll get it",
      salutation: `Hey ${s.verifyFailed.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.verifyFailed.skillName} didn't verify this round. ${s.verifyFailed.detail}`,
      ],
      infoRows: [['Skill', s.verifyFailed.skillName]],
      cta: { label: 'Check my profile', url: s.verifyFailed.profileUrl },
      badge: { label: 'Not verified', tone: 'danger' },
    },
  },

  /* ---------------- verification-locked ---------------- */
  'verification-locked': {
    classic: {
      subject: `Skill locked: ${s.verifyLocked.skillName}`,
      previewText: `${s.verifyLocked.skillName} is temporarily locked.`,
      heading: 'Skill Temporarily Locked',
      salutation: `Dear ${s.verifyLocked.fullName},`,
      paragraphs: [
        `Access to the <strong>${s.verifyLocked.skillName}</strong> verification has been temporarily locked.`,
        s.verifyLocked.detail,
      ],
      infoRows: [
        ['Skill', s.verifyLocked.skillName],
        ['Unlocks on', s.verifyLocked.unlockDate],
      ],
      cta: { label: 'View my profile', url: s.verifyLocked.profileUrl },
      badge: { label: 'Locked', tone: 'warning' },
    },
    minimal: {
      subject: `${s.verifyLocked.skillName} — temporarily locked`,
      previewText: `Unlocks again on ${s.verifyLocked.unlockDate}.`,
      heading: `${s.verifyLocked.skillName} needs a short cooldown`,
      salutation: `Hi ${s.verifyLocked.fullName.split(' ')[0]},`,
      paragraphs: [
        s.verifyLocked.detail,
        `This is a standard safeguard, not a mark against you — it exists so verification results stay meaningful for everyone. Use the time until ${s.verifyLocked.unlockDate} to review the material properly instead of attempting it cold again.`,
      ],
      infoRows: [
        ['Skill', s.verifyLocked.skillName],
        ['Unlocks', s.verifyLocked.unlockDate],
      ],
      cta: { label: 'View my profile', url: s.verifyLocked.profileUrl },
      badge: { label: 'Locked', tone: 'warning' },
      signoff: '— Your study buddy at SMART',
    },
    genz: {
      subject: `🔒 ${s.verifyLocked.skillName} is on a short break`,
      previewText: `Back open on ${s.verifyLocked.unlockDate}.`,
      emoji: '🔒',
      heading: 'This one needs a breather',
      salutation: `Hey ${s.verifyLocked.fullName.split(' ')[0]},`,
      paragraphs: [
        `${s.verifyLocked.detail} It reopens on ${s.verifyLocked.unlockDate} — use the time to prep.`,
      ],
      infoRows: [['Skill', s.verifyLocked.skillName]],
      cta: { label: 'Check my profile', url: s.verifyLocked.profileUrl },
      badge: { label: 'Locked', tone: 'warning' },
    },
  },
};

export const TEMPLATE_LABELS = {
  'institution-admin-invite': 'TPO / Institution Admin Invite',
  'student-invite': 'Student Invite',
  'invite-reminder': 'Invite Reminder',
  'opportunity-shortlisted': 'Opportunity Shortlisted',
  'application-stage-changed': 'Application Stage Changed',
  'verification-passed': 'Verification Passed',
  'verification-failed': 'Verification Failed',
  'verification-locked': 'Verification Locked',
};
