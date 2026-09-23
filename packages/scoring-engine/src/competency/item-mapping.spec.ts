import { describe, expect, it } from 'vitest';
import {
  assignCompetencyIds,
  competencySlotCountForProficiency,
  scaleFormCounts,
} from './item-mapping.js';

const model = [
  { competencyId: 'c1' },
  { competencyId: 'c2' },
  { competencyId: 'c3' },
  { competencyId: 'c4' },
  { competencyId: 'c5' },
  { competencyId: 'c6' },
] as const;

describe('item-mapping', () => {
  it('counts competency slots per proficiency tier', () => {
    expect(competencySlotCountForProficiency('PROFICIENT')).toBe(4);
    expect(competencySlotCountForProficiency('INTERMEDIATE')).toBe(3);
  });

  it('round-robins competency tags across required slots for a target tier', () => {
    expect(
      assignCompetencyIds('MCQ', 1, model, 'PROFICIENT').concat(
        assignCompetencyIds('TRACE', 2, model, 'PROFICIENT'),
        assignCompetencyIds('CODING', 3, model, 'PROFICIENT'),
        assignCompetencyIds('CODING', 4, model, 'PROFICIENT'),
      ),
    ).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('expands diagnostic forms to cover minimum competency slots when requested', () => {
    const scaled = scaleFormCounts({ MCQ: 3, TRACE: 2 }, 2, 'DIAGNOSTIC', { minItemCount: 4 });
    expect(scaled.closed.MCQ + scaled.closed.TRACE + scaled.openCount).toBeGreaterThanOrEqual(4);
  });
});
