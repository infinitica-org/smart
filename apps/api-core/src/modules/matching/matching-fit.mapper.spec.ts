import { describe, expect, it } from 'vitest';
import { mapVerifiedSkillsSummary } from './matching-fit.mapper.js';

describe('mapVerifiedSkillsSummary', () => {
  it('maps verified skill codes to display names and proficiencies', () => {
    const rows = mapVerifiedSkillsSummary([
      {
        code: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        proficiency: 'BEGINNER',
      },
    ]);
    expect(rows).toEqual([
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        proficiency: 'BEGINNER',
      },
    ]);
  });
});
