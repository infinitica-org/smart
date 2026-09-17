import { describe, expect, it } from 'vitest';
import { normalizeOpenBatchGradeIndices } from './open-batch-grade-normalize.js';

describe('normalizeOpenBatchGradeIndices', () => {
  it('maps 0-based grader indices to sealed open-item indices', () => {
    const parsed = normalizeOpenBatchGradeIndices(
      {
        grades: [
          {
            index: 0,
            marksAwarded: 8,
            justification: 'Solid ETL pipeline explanation with trade-offs.',
          },
        ],
      },
      [12],
    );
    expect(parsed.grades[0]?.index).toBe(12);
  });

  it('maps sequential 0,1 to non-contiguous open indices', () => {
    const parsed = normalizeOpenBatchGradeIndices(
      {
        grades: [
          { index: 0, marksAwarded: 5, justification: 'Partial answer with gaps in detail.' },
          {
            index: 1,
            marksAwarded: 7,
            justification: 'Good coverage of incremental load pattern.',
          },
        ],
      },
      [11, 12],
    );
    expect(parsed.grades.map((g) => g.index)).toEqual([11, 12]);
  });

  it('leaves correct 1-based indices unchanged', () => {
    const parsed = normalizeOpenBatchGradeIndices(
      {
        grades: [{ index: 12, marksAwarded: 10, justification: 'Complete and accurate response.' }],
      },
      [12],
    );
    expect(parsed.grades[0]?.index).toBe(12);
  });

  it('falls back to grade array position when index is unrelated to sealed indices', () => {
    const parsed = normalizeOpenBatchGradeIndices(
      {
        grades: [
          {
            index: 999,
            marksAwarded: 6,
            justification: 'Partial ELT answer missing failure recovery details.',
          },
        ],
      },
      [12],
    );
    expect(parsed.grades[0]?.index).toBe(12);
  });
});
