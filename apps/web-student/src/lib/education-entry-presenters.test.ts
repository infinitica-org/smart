import { describe, expect, it } from 'vitest';
import { parseEducationDisplay } from './education-entry-presenters';

describe('parseEducationDisplay', () => {
  it('formats school/board, program title, and percentage score for display cards', () => {
    const display = parseEducationDisplay({
      id: '1',
      studentId: 's1',
      institutionName: 'Central Board · CBSE',
      degree: 'Full-time — 12th Standard',
      fieldOfStudy: 'Science',
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      current: false,
      grade: '89%',
      status: 'verified',
      documents: [{ id: 'd1' } as never],
      createdAt: '',
      updatedAt: '',
    });

    expect(display.programTitle).toBe('Higher Secondary (12th)');
    expect(display.schoolName).toBe('Central Board');
    expect(display.boardName).toBe('CBSE');
    expect(display.streamLabel).toBe('Science');
    expect(display.finalScore).toBe('89%');
    expect(display.scoreSummary).toBe('Percentage: 89%');
  });
});
