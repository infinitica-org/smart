import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectStatusBadge } from './ProjectStatusBadge';

describe('ProjectStatusBadge', () => {
  it('shows verified label for verified projects', () => {
    render(
      <ProjectStatusBadge
        project={{
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          studentId: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Demo',
          problem: 'Problem statement long enough for tests.',
          approach: 'Approach statement long enough for tests.',
          stack: 'TypeScript',
          outcome: 'Outcome statement long enough for tests.',
          loomUrl: null,
          githubUrl: null,
          liveUrl: null,
          status: 'VERIFIED',
          createdAt: '2026-09-02T10:00:00.000Z',
          report: null,
          interviewRequired: false,
          interviewStatus: 'NOT_REQUIRED',
          interviewCompletedAt: null,
        }}
      />,
    );
    expect(screen.getByText(/^Verified$/i)).toBeTruthy();
  });
});
