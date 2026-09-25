import { SmartApiError } from '@smart/api-client';
import { APPLICATION_STATUSES, type EmployerApplicantCard } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import {
  BOARD_COLUMNS,
  canDrop,
  describeMoveFailure,
  dropTargets,
  groupByStatus,
  moveApplicant,
} from './pipeline-board';

const applicant = (id: string, status: EmployerApplicantCard['status']): EmployerApplicantCard => ({
  applicationId: id,
  candidateName: `Candidate ${id}`,
  fit: null,
  fitRecalculated: false,
  status,
  statusLabel: status,
  allowedNext: [],
  appliedAt: '2026-09-01T00:00:00.000Z',
});

describe('pipeline board logic (Th6-414)', () => {
  it('has one column per status in pipeline order', () => {
    expect([...BOARD_COLUMNS]).toEqual([...APPLICATION_STATUSES]);
  });

  it('groups applicants into their columns, keeping empty columns', () => {
    const groups = groupByStatus([
      applicant('1', 'APPLIED'),
      applicant('2', 'APPLIED'),
      applicant('3', 'HIRED'),
    ]);
    expect(groups.APPLIED).toHaveLength(2);
    expect(groups.HIRED).toHaveLength(1);
    expect(groups.REVIEWING).toEqual([]);
  });

  it('offers only the moves the server allows as drop targets', () => {
    expect(dropTargets(applicant('1', 'APPLIED'))).toEqual(['REVIEWING', 'REJECTED']);
    expect(dropTargets(applicant('1', 'OFFERED'))).toEqual(['HIRED', 'REJECTED']);
    expect(dropTargets(applicant('1', 'HIRED'))).toEqual([]);
    expect(dropTargets(applicant('1', 'WITHDRAWN'))).toEqual([]);
    // an employer can never drop onto Withdrawn
    for (const status of APPLICATION_STATUSES) {
      expect(dropTargets(applicant('1', status))).not.toContain('WITHDRAWN');
    }
  });

  it('refuses to skip stages, go backwards, or leave a finished status', () => {
    expect(canDrop(applicant('1', 'APPLIED'), 'OFFERED')).toBe(false);
    expect(canDrop(applicant('1', 'OFFERED'), 'REVIEWING')).toBe(false);
    expect(canDrop(applicant('1', 'REJECTED'), 'REVIEWING')).toBe(false);
    expect(canDrop(applicant('1', 'APPLIED'), 'REVIEWING')).toBe(true);
  });

  it('moves a card optimistically and refreshes its label and next moves, without touching others', () => {
    const list = [applicant('1', 'APPLIED'), applicant('2', 'APPLIED')];
    const next = moveApplicant(list, '1', 'REVIEWING');
    expect(next[0]).toMatchObject({
      status: 'REVIEWING',
      statusLabel: 'Reviewing',
      allowedNext: ['INTERVIEWING', 'REJECTED'],
    });
    expect(next[1]).toBe(list[1]);
    expect(list[0]?.status).toBe('APPLIED'); // the original is not mutated (so rollback is exact)
  });

  it('describes failures: 409 conflict, 422 not allowed, anything else generic', () => {
    const conflict = new SmartApiError({
      error: 'stale_status',
      message: 'This application is now Reviewing.',
      statusCode: 409,
    } as never);
    const refused = new SmartApiError({
      error: 'transition_not_allowed',
      message: "Can't move from Applied to Offered",
      statusCode: 422,
    } as never);
    expect(describeMoveFailure(conflict)).toEqual({
      kind: 'conflict',
      message: 'This application is now Reviewing.',
    });
    expect(describeMoveFailure(refused)).toEqual({
      kind: 'not_allowed',
      message: "Can't move from Applied to Offered",
    });
    expect(describeMoveFailure(new Error('x')).kind).toBe('other');
  });
});
