import { describe, expect, it } from 'vitest';
import { renderEmailTemplate } from './email-templates.js';

describe('renderEmailTemplate', () => {
  it('renders distinct HTML for invitation and opportunity templates', () => {
    const invite = renderEmailTemplate('student-invite', {
      fullName: 'Alex Student',
      institutionName: 'SMART University',
      inviteUrl: 'http://localhost:3005/invite/token',
      batchName: 'CS 2026',
    });
    const opportunity = renderEmailTemplate('opportunity-shortlisted', {
      fullName: 'Alex Student',
      companyName: 'Infinitica Labs',
      roleTitle: 'Backend Engineer',
      applicationsUrl: 'http://localhost:3001/applications',
    });

    expect(invite.subject).toContain('SMART University');
    expect(opportunity.subject).toContain('Backend Engineer');
    // Both templates share the single brand accent (no more per-type colored header).
    expect(invite.html).toContain('#2fbfae');
    expect(opportunity.html).toContain('#2fbfae');
    expect(invite.html).not.toEqual(opportunity.html);
  });

  it('renders verification templates with a status-specific badge color', () => {
    const passed = renderEmailTemplate('verification-passed', {
      fullName: 'Alex Student',
      skillName: 'Database fundamentals',
      statusLabel: 'Verified',
      detail: 'Your claim is now visible to placement staff.',
      profileUrl: 'http://localhost:3001/profile',
    });
    const locked = renderEmailTemplate('verification-locked', {
      fullName: 'Alex Student',
      skillName: 'Database fundamentals',
      statusLabel: 'Locked for cooldown',
      detail: 'You can retry after the cooldown period ends.',
      profileUrl: 'http://localhost:3001/profile',
    });

    expect(passed.html).toContain('#1f9d55'); // success badge
    expect(locked.html).toContain('#d97706'); // warning badge
    expect(passed.html).toContain('Verified');
    expect(locked.html).toContain('Locked for cooldown');
    expect(passed.text).toContain('Database fundamentals');
  });

  it('renders the certificate endorsement request template', () => {
    const email = renderEmailTemplate('certificate-endorsement-request', {
      endorserName: 'Priya Manager',
      candidateName: 'Alex Student',
      certificateTitle: 'AWS Solutions Architect',
      certificateIssuer: 'Amazon Web Services',
      endorsementUrl: 'http://localhost:3001/endorse/token',
      expiresAtFormatted: '7 days',
    });

    expect(email.subject).toContain('Alex Student');
    expect(email.html).toContain('AWS Solutions Architect');
    expect(email.html).toContain('Amazon Web Services');
    expect(email.text).toContain('http://localhost:3001/endorse/token');
  });

  it('renders distinct content per CO-T05 stage for application-stage-changed', () => {
    const base = {
      fullName: 'Alex Student',
      companyName: 'Infinitica Labs',
      roleTitle: 'Backend Engineer',
      applicationsUrl: 'http://localhost:3001/applications',
    };

    const aiVerified = renderEmailTemplate('application-stage-changed', {
      ...base,
      fromStage: 'SHORTLISTED',
      toStage: 'AI_VERIFIED',
    });
    const offer = renderEmailTemplate('application-stage-changed', {
      ...base,
      fromStage: 'INTERVIEW',
      toStage: 'OFFER',
    });
    const hired = renderEmailTemplate('application-stage-changed', {
      ...base,
      fromStage: 'OFFER',
      toStage: 'HIRED',
    });
    const rejected = renderEmailTemplate('application-stage-changed', {
      ...base,
      fromStage: 'INTERVIEW',
      toStage: 'REJECTED',
    });

    expect(aiVerified.text).toContain('AI verification');
    expect(offer.html).toContain('#1f9d55');
    expect(offer.text).toContain('Congratulations on the offer');
    expect(hired.text).toContain("you've been hired");
    expect(rejected.html).toContain('#dc2626');
    expect(rejected.text).toContain("didn't work out");

    const bodies = [aiVerified.text, offer.text, hired.text, rejected.text];
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});
