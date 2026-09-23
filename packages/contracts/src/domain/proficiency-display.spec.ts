import { describe, expect, it } from 'vitest';

import {
  COMPETENCY_GAP_DEMONSTRATION_LEVEL,
  competencyDemonstrationLevel,
  proficiencyLegendEntries,
  proficiencyLevelNumber,
  proficiencyLevelUiLabel,
} from './skill-levels.js';

describe('proficiency display helpers', () => {
  it('maps proficiency enums to level numbers and UI labels', () => {
    expect(proficiencyLevelNumber('BEGINNER')).toBe(1);
    expect(proficiencyLevelUiLabel('BEGINNER')).toBe('Level 1');
    expect(proficiencyLevelNumber('PROFICIENT')).toBe(3);
    expect(proficiencyLevelUiLabel('PROFICIENT')).toBe('Level 3');
    expect(proficiencyLevelNumber('PROFESSIONAL')).toBe(5);
    expect(proficiencyLevelUiLabel('PROFESSIONAL')).toBe('Level 5');
    expect(proficiencyLevelNumber('UNKNOWN')).toBe(0);
    expect(proficiencyLevelUiLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('builds a five-line legend for tooltips', () => {
    expect(proficiencyLegendEntries()).toEqual([
      { level: 1, traditionalLabel: 'Beginner' },
      { level: 2, traditionalLabel: 'Intermediate' },
      { level: 3, traditionalLabel: 'Proficient' },
      { level: 4, traditionalLabel: 'Advanced' },
      { level: 5, traditionalLabel: 'Professional' },
    ]);
  });

  it('derives competency demonstration level from hit score', () => {
    expect(COMPETENCY_GAP_DEMONSTRATION_LEVEL).toBe(2);
    expect(competencyDemonstrationLevel(0.6)).toBe(2);
    expect(competencyDemonstrationLevel(0.3)).toBe(1);
    expect(competencyDemonstrationLevel(0.1)).toBe(0);
  });
});
