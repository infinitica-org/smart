import { describe, expect, it } from 'vitest';
import { buildQlixSmartContext } from './qlix-smart-context.js';

describe('buildQlixSmartContext', () => {
  it('returns null when no skill mappings exist', () => {
    expect(
      buildQlixSmartContext({
        projectId: '11111111-1111-4111-8111-111111111111',
        studentId: '22222222-2222-4222-8222-222222222222',
        title: 'Bus tracker',
        problem: 'Students cannot see buses on campus routes in real time.',
        approach: 'Built a websocket ingest and a small map UI for riders.',
        stack: 'TypeScript, Nest',
        outcome: 'Pilot with 30 students reduced average wait confusion.',
        skillMappings: [],
      }),
    ).toBeNull();
  });

  it('builds smartContext from the primary skill mapping and competency blueprint', () => {
    const ctx = buildQlixSmartContext({
      projectId: '11111111-1111-4111-8111-111111111111',
      studentId: '22222222-2222-4222-8222-222222222222',
      title: 'Bus tracker',
      problem: 'Students cannot see buses on campus routes in real time.',
      approach: 'Built a websocket ingest and a small map UI for riders.',
      stack: 'TypeScript, Nest',
      outcome: 'Pilot with 30 students reduced average wait confusion.',
      skillMappings: [
        {
          skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          specificContribution: 'Implemented the websocket ingest service.',
          componentWorkedOn: 'backend ingest',
          actionsPerformed: ['Built websocket gateway'],
        },
      ],
    });

    expect(ctx).not.toBeNull();
    if (!ctx) return;
    expect(ctx.clientRef.skillCode).toBe('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(ctx.competencyContext.competencies.length).toBeGreaterThan(0);
    expect(ctx.competencyContext.competencies[0]?.competencyId).toBeTruthy();
    expect(ctx.skillMapping.specificContribution).toContain('websocket');
  });
});
