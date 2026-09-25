import { describe, expect, it } from 'vitest';
import { STUDENT_TIMELINE_EVENT_SELECT, studentTimeline } from './student-timeline.js';

const at = (day: number) => new Date(`2026-09-${String(day).padStart(2, '0')}T00:00:00.000Z`);

describe('studentTimeline (Th6-419)', () => {
  it('is empty when there is no history', () => {
    expect(studentTimeline([])).toEqual([]);
  });

  it('shows each shareable status change with its time, and nothing else', () => {
    const timeline = studentTimeline([
      { toStage: 'APPLIED', createdAt: at(1) },
      { toStage: 'INTERVIEW', createdAt: at(5) },
    ]);
    expect(timeline.map((t) => t.status)).toEqual(['APPLIED', 'INTERVIEWING']);
    for (const entry of timeline) {
      expect(Object.keys(entry).sort()).toEqual(['at', 'status', 'statusLabel']);
    }
  });

  it('collapses internal steps the student cannot tell apart into one', () => {
    const timeline = studentTimeline([
      { toStage: 'APPLIED', createdAt: at(1) },
      { toStage: 'SHORTLISTED', createdAt: at(2) },
      { toStage: 'AI_VERIFIED', createdAt: at(3) },
    ]);
    expect(timeline).toHaveLength(2);
    expect(timeline[1]?.at).toBe(at(2).toISOString());
  });

  it('only selects the stage and time from history, never notes, actors or sources', () => {
    expect(Object.keys(STUDENT_TIMELINE_EVENT_SELECT)).toEqual(['toStage', 'createdAt']);
  });
});
