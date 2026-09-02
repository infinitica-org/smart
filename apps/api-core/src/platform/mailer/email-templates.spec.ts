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
    expect(invite.html).toContain('#4f46e5');
    expect(opportunity.html).toContain('#059669');
    expect(invite.html).not.toEqual(opportunity.html);
  });

  it('renders verification templates with different accent colors', () => {
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

    expect(passed.html).toContain('#16a34a');
    expect(locked.html).toContain('#d97706');
    expect(passed.text).toContain('Database fundamentals');
  });
});
