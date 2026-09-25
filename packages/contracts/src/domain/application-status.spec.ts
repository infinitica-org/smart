import { describe, expect, it } from 'vitest';
import { ATS_STAGES } from './enums.js';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  applicationReference,
  canWithdrawFromStage,
  studentStatusLabel,
  toApplicationStatus,
} from './application-status.js';

describe('application status mapping (APP-01)', () => {
  it('maps every stored stage to exactly one student-facing status', () => {
    for (const stage of ATS_STAGES) {
      expect(APPLICATION_STATUSES).toContain(toApplicationStatus(stage));
    }
  });

  it('uses the agreed student-facing labels', () => {
    expect(APPLICATION_STATUS_LABELS).toEqual({
      APPLIED: 'Submitted',
      REVIEWING: 'Under review',
      INTERVIEWING: 'Interviewing',
      OFFERED: 'Offer',
      HIRED: 'Hired',
      REJECTED: 'Not selected',
      WITHDRAWN: 'Withdrawn',
    });
    expect(studentStatusLabel('SHORTLISTED')).toBe('Under review');
    expect(studentStatusLabel('AI_VERIFIED')).toBe('Under review');
    expect(studentStatusLabel('INTERVIEW')).toBe('Interviewing');
    expect(studentStatusLabel('OFFER')).toBe('Offer');
    expect(studentStatusLabel('REJECTED')).toBe('Not selected');
  });

  it('allows withdrawing only from open stages', () => {
    expect(canWithdrawFromStage('APPLIED')).toBe(true);
    expect(canWithdrawFromStage('INTERVIEW')).toBe(true);
    expect(canWithdrawFromStage('OFFER')).toBe(true);
    expect(canWithdrawFromStage('HIRED')).toBe(false);
    expect(canWithdrawFromStage('REJECTED')).toBe(false);
    expect(canWithdrawFromStage('WITHDRAWN')).toBe(false);
  });

  it('derives a stable, readable reference number', () => {
    const ref = applicationReference('12345678-90ab-4cde-8f01-234567890abc');
    expect(ref).toBe('APP-12345678');
    expect(ref).toMatch(/^APP-[0-9A-F]{8}$/);
  });
});
