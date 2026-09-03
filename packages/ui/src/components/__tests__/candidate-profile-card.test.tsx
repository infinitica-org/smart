import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CandidateProfileCard } from '../candidate-profile-card';

const mockSkills = [
  { name: 'TypeScript', status: 'VERIFIED' },
  { name: 'React', status: 'IN_PROGRESS' },
];

const mockProjects = [
  {
    title: 'SMART Platform',
    description: 'An advanced AI certification system.',
    stack: ['React', 'TypeScript', 'Tailwind'],
    loomUrl: 'https://loom.com/test',
    githubUrl: 'https://github.com/test/repo',
  },
];

describe('CandidateProfileCard', () => {
  it('renders basic candidate information and tier', () => {
    render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
      />,
    );

    expect(screen.getByText('Varun R')).toBeDefined();
    expect(screen.getByText('Software Engineering')).toBeDefined();
    expect(screen.getByText('Gold')).toBeDefined(); // TierBadge title-cased
  });

  it('renders skills with their verification statuses', () => {
    render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
      />,
    );

    expect(screen.getByText('TypeScript')).toBeDefined();
    expect(screen.getByText('React')).toBeDefined();
    // VerificationBadges are rendered for skills
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('renders optional projects when provided', () => {
    render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
        projects={mockProjects}
      />,
    );

    expect(screen.getByText('SMART Platform')).toBeDefined();
    expect(screen.getByText('An advanced AI certification system.')).toBeDefined();
    expect(screen.getAllByText('React').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0);
    expect(screen.getByText('Tailwind')).toBeDefined();
    expect(screen.getByText('Watch Loom Preview')).toBeDefined();
    expect(screen.getByText('Repository')).toBeDefined();
  });

  it('renders optional academic details only when provided', () => {
    const { rerender } = render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
      />,
    );

    // Should not render GPA/Batch headers
    expect(screen.queryByText('Batch')).toBeNull();
    expect(screen.queryByText('GPA')).toBeNull();

    rerender(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
        academicDetails={{
          batchName: '2026-CS',
          gpa: '9.2',
          graduationYear: 2026,
        }}
      />,
    );

    expect(screen.getByText('Batch')).toBeDefined();
    expect(screen.getByText('2026-CS')).toBeDefined();
    expect(screen.getByText('9.2')).toBeDefined();
  });

  it('renders optional contact details only when provided', () => {
    const { rerender } = render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
      />,
    );

    expect(screen.queryByText('varun@example.com')).toBeNull();

    rerender(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
        contactInfo={{
          email: 'varun@example.com',
          phone: '+919999999999',
          linkedIn: 'https://linkedin.com/in/varun',
          github: 'https://github.com/varun',
        }}
      />,
    );

    expect(screen.getByText('varun@example.com')).toBeDefined();
    expect(screen.getByText('+919999999999')).toBeDefined();
    expect(screen.getByText('LinkedIn')).toBeDefined();
    expect(screen.getByText('GitHub')).toBeDefined();
  });

  it('renders optional AI Match Insight panel only when provided', () => {
    const { rerender } = render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
      />,
    );

    expect(screen.queryByText('Strong track record in React.')).toBeNull();

    rerender(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
        aiExplanation={{
          summary: 'Strong track record in React.',
          score: 95,
          tone: 'success',
        }}
      />,
    );

    expect(screen.getByText('Strong track record in React.')).toBeDefined();
    expect(screen.getByText('95%')).toBeDefined();
  });

  it('renders action buttons when provided', () => {
    render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
        actions={<button data-testid="custom-action">Shortlist</button>}
      />,
    );

    expect(screen.getByTestId('custom-action')).toBeDefined();
    expect(screen.getByTestId('custom-action').textContent).toBe('Shortlist');
  });
});
