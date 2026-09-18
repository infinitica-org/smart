import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDto } from '@smart/contracts';
import { ProjectCard } from './ProjectCard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function interviewReadyProject(): ProjectDto {
  return {
    projectId: '7cf5e6c9-621d-4dae-a94b-0053f952d890',
    studentId: '123e4567-e89b-12d3-a456-426614174001',
    title: 'VerifiAI',
    problem: 'Problem statement long enough for validation in tests.',
    approach: 'Approach statement long enough for validation in tests.',
    stack: 'JavaScript',
    outcome: 'Outcome statement long enough for validation in tests.',
    loomUrl: null,
    githubUrl: 'https://github.com/example/repo',
    liveUrl: null,
    status: 'SUBMITTED',
    createdAt: '2026-09-02T10:00:00.000Z',
    interviewRequired: true,
    interviewStatus: 'PENDING',
    report: {
      reportId: '223e4567-e89b-12d3-a456-426614174002',
      projectId: '7cf5e6c9-621d-4dae-a94b-0053f952d890',
      score: 72,
      relevanceScore: 70,
      qualityScore: 75,
      duplicateScore: 0,
      confidence: 0.9,
      plagiarismFlag: false,
      techAgeFlag: false,
      flags: [],
      explanation: 'Ready for interview — sufficient detail for verify report.',
      routedToReview: false,
      promptRef: 'project-verify@1',
      auditId: null,
      createdAt: '2026-09-02T11:00:00.000Z',
    },
    interviewCompletedAt: null,
  };
}

describe('ProjectCard', () => {
  it('shows Start interview when ownership interview is pending', () => {
    render(<ProjectCard project={interviewReadyProject()} onView={vi.fn()} />);

    const start = screen.getByRole('link', { name: /start interview/i });
    expect(start.getAttribute('href')).toBe(
      '/profile/projects/7cf5e6c9-621d-4dae-a94b-0053f952d890/defense',
    );
  });
});
