import type { ProjectDefenseContext } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import {
  stubExaminerTurn,
  stubGraderOutput,
  stubOpeningQuestion,
} from './project-defense-dev-stub.js';

const baseContext: ProjectDefenseContext = {
  projectId: '00000000-0000-4000-8000-000000000001',
  projectTitle: 'Bus tracker',
  projectSummary:
    'Problem: Students cannot see buses on campus routes in real time.\nApproach: Built a websocket ingest.',
  stack: 'TypeScript, NestJS, Redis',
  declaredArtefacts: [],
  verifyFlags: [],
  verifyGaps: [],
  snapshotDigest: 'digest',
};

describe('project-defense dev stub', () => {
  it('builds a project-specific opening question', () => {
    const opening = stubOpeningQuestion(baseContext);
    expect(opening.question).toContain('Bus tracker');
    expect(opening.question).toMatch(/TypeScript|NestJS|Redis/i);
    expect(opening.question).not.toContain('Walk us through this project');
    expect(opening.isFinalTurn).toBe(false);
  });

  it('asks an ownership follow-up when candidate denies building the project', () => {
    const turn = stubExaminerTurn(
      {
        context: baseContext,
        turns: [{ turnIndex: 0, role: 'CANDIDATE', text: "no I didn't do this project", at: '' }],
      },
      300,
    );
    expect(turn.question.toLowerCase()).toContain('did not build');
    expect(turn.isFinalTurn).toBe(true);
  });

  it('asks stack-specific skills questions early in the interview', () => {
    const turn = stubExaminerTurn(
      {
        context: baseContext,
        turns: [{ turnIndex: 0, role: 'CANDIDATE', text: 'I built the websocket layer.', at: '' }],
      },
      500,
    );
    expect(turn.probes).toBe('SKILLS_APPLICATION');
    expect(turn.question).toMatch(/TypeScript|NestJS|Redis/i);
  });

  it('does not end the interview when the candidate mentions making a feature', () => {
    const turn = stubExaminerTurn(
      {
        context: {
          ...baseContext,
          stack: 'TypeScript, Redis',
        },
        turns: [
          {
            turnIndex: 0,
            role: 'CANDIDATE',
            text: "I didn't make the map load fast until I cached the route polylines.",
            at: '',
          },
        ],
      },
      500,
    );
    expect(turn.isFinalTurn).toBe(false);
    expect(turn.probes).toBe('SKILLS_APPLICATION');
  });

  it('flags ownership concern in grader stub when candidate denies project', () => {
    const grade = stubGraderOutput({
      context: baseContext,
      turns: [{ turnIndex: 0, role: 'CANDIDATE', text: "I didn't build this", at: '' }],
    });
    expect(grade.ownershipConcern).toBe(true);
  });
});
