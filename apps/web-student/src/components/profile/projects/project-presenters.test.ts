import { describe, expect, it } from 'vitest';
import { parseStackTags, projectSummaryText } from './project-presenters';

describe('project-presenters', () => {
  it('parses comma-separated stack tags', () => {
    expect(parseStackTags('React, Node.js , MongoDB')).toEqual(['React', 'Node.js', 'MongoDB']);
  });

  it('truncates long problem summaries', () => {
    const problem = 'A'.repeat(200);
    const summary = projectSummaryText(
      {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        title: 'T',
        problem,
        approach: '',
        stack: '',
        outcome: '',
        loomUrl: null,
        githubUrl: null,
        liveUrl: null,
        status: 'SUBMITTED',
        createdAt: '2026-09-02T10:00:00.000Z',
        report: null,
      },
      50,
    );
    expect(summary.endsWith('…')).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(50);
  });
});
