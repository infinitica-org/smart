import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CandidateProfileCard, getLoomEmbedUrl } from '../candidate-profile-card';

const mockSkills = [
  { name: 'TypeScript', status: 'VERIFIED' },
  { name: 'React', status: 'IN_PROGRESS' },
];

const mockProjects = [
  {
    title: 'SMART Platform',
    description: 'An advanced AI certification system.',
    stack: ['React', 'TypeScript', 'Tailwind'],
    loomUrl: 'https://www.loom.com/share/1234567890abcdef',
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

  it('renders optional projects with embedded video when provided', () => {
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

    // Check iframe video embed
    const iframe = screen.getByTitle('Project video: SMART Platform') as HTMLIFrameElement;
    expect(iframe).toBeDefined();
    expect(iframe.src).toBe('https://www.loom.com/embed/1234567890abcdef');
  });

  it('correctly converts Loom share/watch URLs into embed URLs', () => {
    expect(getLoomEmbedUrl('https://www.loom.com/share/abc123')).toBe(
      'https://www.loom.com/embed/abc123',
    );
    expect(getLoomEmbedUrl('https://loom.com/watch/def456')).toBe(
      'https://www.loom.com/embed/def456',
    );
    expect(getLoomEmbedUrl('https://www.loom.com/embed/ghi789')).toBe(
      'https://www.loom.com/embed/ghi789',
    );
    expect(getLoomEmbedUrl('invalid-url')).toBeNull();
    expect(getLoomEmbedUrl(undefined)).toBeNull();
  });

  it('renders Cognitive & Communication Summary section when provided', () => {
    render(
      <CandidateProfileCard
        candidateId="c-123"
        displayName="Varun R"
        trackName="Software Engineering"
        headlineTier="GOLD"
        skills={mockSkills}
        cognitiveCommSummary={{
          cognitiveScore: 92,
          cognitiveStrengths: ['System Design', 'Algorithmic Problem Solving'],
          communicationScore: 88,
          communicationSummary:
            'Articulate defense of architectural tradeoffs with clear conciseness.',
          overallNotes: 'Strong analytical skills coupled with effective team communication.',
        }}
      />,
    );

    expect(screen.getByText('Cognitive & Communication Profile')).toBeDefined();
    expect(screen.getByText('Cognitive Strengths')).toBeDefined();
    expect(screen.getByText('92%')).toBeDefined();
    expect(screen.getByText('System Design')).toBeDefined();
    expect(screen.getByText('Algorithmic Problem Solving')).toBeDefined();
    expect(screen.getByText('Communication & Defense')).toBeDefined();
    expect(screen.getByText('88%')).toBeDefined();
    expect(
      screen.getByText('Articulate defense of architectural tradeoffs with clear conciseness.'),
    ).toBeDefined();
    expect(
      screen.getByText('Strong analytical skills coupled with effective team communication.'),
    ).toBeDefined();
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
