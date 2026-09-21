import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentProjectInterviewsHub } from './StudentProjectInterviewsHub';

const listMineMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    projects: {
      listMine: () => listMineMock(),
    },
  },
}));

describe('StudentProjectInterviewsHub', () => {
  beforeEach(() => {
    listMineMock.mockReset();
  });

  it('lists pending project ownership interviews', async () => {
    listMineMock.mockResolvedValue({
      projects: [
        {
          projectId: 'proj-1',
          studentId: 'stu-1',
          title: 'Capstone CRM',
          problem: '',
          approach: '',
          stack: '',
          outcome: '',
          status: 'SUBMITTED',
          githubUrl: null,
          liveUrl: null,
          interviewRequired: true,
          interviewStatus: 'PENDING',
          interviewCompletedAt: null,
          report: { score: 80, summary: 'ok', gaps: [], strengths: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<StudentProjectInterviewsHub />);

    expect(await screen.findByRole('heading', { name: 'Capstone CRM' })).toBeDefined();
    expect(screen.getByRole('link', { name: /Start interview/i }).getAttribute('href')).toBe(
      '/profile/projects/proj-1/defense',
    );
  });
});
