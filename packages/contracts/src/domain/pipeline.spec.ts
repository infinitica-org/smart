import { describe, expect, it } from 'vitest';
import { ATS_STAGES } from './enums.js';
import {
  APPLICATION_STATUSES,
  toApplicationStatus,
  type ApplicationStatus,
} from './application-status.js';
import {
  ACTOR_TYPES,
  ALLOWED_TRANSITIONS,
  STAGES_FOR_STATUS,
  STAGE_FOR_STATUS,
  allowedNextStatuses,
  canTransition,
  isTerminal,
  transitionErrorMessage,
} from './pipeline.js';

/** The full rule, written out independently of the implementation: every pair x every actor. */
function expected(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: (typeof ACTOR_TYPES)[number],
): boolean {
  const forward: Record<string, string[]> = {
    APPLIED: ['REVIEWING', 'REJECTED'],
    REVIEWING: ['INTERVIEWING', 'REJECTED'],
    INTERVIEWING: ['OFFERED', 'REJECTED'],
    OFFERED: ['HIRED', 'REJECTED'],
  };
  const terminal = ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(from);
  if (terminal) return false;
  if (to === 'WITHDRAWN') return actor === 'STUDENT';
  if (actor === 'STUDENT') return false;
  return (forward[from] ?? []).includes(to);
}

describe('pipeline transitions (Th6-415)', () => {
  it('has the seven statuses, three of them terminal', () => {
    expect([...APPLICATION_STATUSES]).toEqual([
      'APPLIED',
      'REVIEWING',
      'INTERVIEWING',
      'OFFERED',
      'HIRED',
      'REJECTED',
      'WITHDRAWN',
    ]);
    expect(APPLICATION_STATUSES.filter(isTerminal)).toEqual(['HIRED', 'REJECTED', 'WITHDRAWN']);
  });

  describe.each(ACTOR_TYPES)('every from/to pair for %s', (actor) => {
    const pairs = APPLICATION_STATUSES.flatMap((from) =>
      APPLICATION_STATUSES.map((to) => [from, to] as const),
    );
    it.each(pairs)('%s -> %s', (from, to) => {
      expect(canTransition(from, to, actor)).toBe(expected(from, to, actor));
    });
  });

  it('lets employers move forward one step or reject, and nothing else', () => {
    expect(canTransition('APPLIED', 'REVIEWING', 'EMPLOYER')).toBe(true);
    expect(canTransition('APPLIED', 'REJECTED', 'EMPLOYER')).toBe(true);
    expect(canTransition('APPLIED', 'OFFERED', 'EMPLOYER')).toBe(false); // no skipping
    expect(canTransition('OFFERED', 'REVIEWING', 'EMPLOYER')).toBe(false); // no going back
    expect(canTransition('REVIEWING', 'WITHDRAWN', 'EMPLOYER')).toBe(false); // only the student withdraws
  });

  it('lets a student only withdraw an unfinished application', () => {
    for (const from of ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED'] as const) {
      expect(canTransition(from, 'WITHDRAWN', 'STUDENT')).toBe(true);
    }
    for (const from of ['HIRED', 'REJECTED', 'WITHDRAWN'] as const) {
      expect(canTransition(from, 'WITHDRAWN', 'STUDENT')).toBe(false);
    }
    expect(canTransition('APPLIED', 'REVIEWING', 'STUDENT')).toBe(false);
  });

  it('never leaves a terminal status', () => {
    for (const from of ['HIRED', 'REJECTED', 'WITHDRAWN'] as const) {
      expect(ALLOWED_TRANSITIONS[from]).toEqual([]);
      for (const to of APPLICATION_STATUSES) {
        for (const actor of ACTOR_TYPES) expect(canTransition(from, to, actor)).toBe(false);
      }
    }
  });

  it('lists exactly the moves an actor may make, for drop targets and dropdowns', () => {
    expect(allowedNextStatuses('APPLIED', 'EMPLOYER')).toEqual(['REVIEWING', 'REJECTED']);
    expect(allowedNextStatuses('OFFERED', 'EMPLOYER')).toEqual(['HIRED', 'REJECTED']);
    expect(allowedNextStatuses('INTERVIEWING', 'STUDENT')).toEqual(['WITHDRAWN']);
    expect(allowedNextStatuses('HIRED', 'EMPLOYER')).toEqual([]);
  });

  it('explains a refusal in plain words', () => {
    expect(transitionErrorMessage('APPLIED', 'OFFERED')).toBe("Can't move from Applied to Offered");
    expect(transitionErrorMessage('HIRED', 'REJECTED')).toContain('can no longer be moved');
  });

  it('maps every status to a stored stage that maps back to it', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(toApplicationStatus(STAGE_FOR_STATUS[status])).toBe(status);
      for (const stage of STAGES_FOR_STATUS[status])
        expect(toApplicationStatus(stage)).toBe(status);
    }
    // every stored stage belongs to exactly one status
    for (const stage of ATS_STAGES) {
      const owners = APPLICATION_STATUSES.filter((s) => STAGES_FOR_STATUS[s].includes(stage));
      expect(owners).toHaveLength(1);
    }
  });
});
