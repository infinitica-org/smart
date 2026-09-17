import { describe, expect, it } from 'vitest';
import { computeTotalSemesters, syncSemesterRows } from './education-degree-details';

describe('education-degree-details', () => {
  it('computes semester count from course duration and semesters per year', () => {
    expect(
      computeTotalSemesters({
        program: 'B.Tech',
        startYear: '2022',
        endYear: '2026',
        currentlyStudying: false,
        semestersPerYear: 2,
        lateralEntry: false,
      }),
    ).toBe(8);
  });

  it('reduces semester rows for lateral entry by one academic year', () => {
    expect(
      computeTotalSemesters({
        program: 'B.Tech',
        startYear: '2022',
        endYear: '2026',
        currentlyStudying: false,
        semestersPerYear: 2,
        lateralEntry: true,
      }),
    ).toBe(6);
  });

  it('grows or shrinks semester row arrays without losing entered values', () => {
    const rows = syncSemesterRows(3, [
      { performance: '80', backlogsTotal: '0', backlogsOngoing: '0' },
      { performance: '82', backlogsTotal: '1', backlogsOngoing: '0' },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.performance).toBe('80');
    expect(rows[2]?.performance).toBe('');
  });
});
