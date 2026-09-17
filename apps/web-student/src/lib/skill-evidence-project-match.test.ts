import { describe, expect, it } from 'vitest';
import { projectStackDeclaresSkill } from './skill-evidence-project-match';

describe('projectStackDeclaresSkill', () => {
  it('matches stack tags to catalog skill names (e.g. Python)', () => {
    expect(
      projectStackDeclaresSkill(
        {
          projectId: '11111111-1111-4111-8111-111111111111',
          studentId: '22222222-2222-4222-8222-222222222222',
          title: 'API',
          problem: 'p',
          approach: 'a',
          stack: 'Python, FastAPI, PostgreSQL',
          outcome: 'o',
          loomUrl: null,
          githubUrl: null,
          liveUrl: null,
          status: 'SUBMITTED',
          createdAt: '2026-01-01T00:00:00.000Z',
          report: null,
          interviewRequired: false,
          interviewStatus: 'NOT_REQUIRED',
          interviewCompletedAt: null,
        },
        'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      ),
    ).toBe(true);
  });
});
