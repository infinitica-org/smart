import { describe, expect, it } from 'vitest';
import {
  assessmentMeetsTarget,
  claimProficiencyFromDemonstrated,
  hasDemonstratedProficiency,
} from './verified-proficiency.js';

describe('verified-proficiency', () => {
  it('treats null demonstration as failing target checks', () => {
    expect(hasDemonstratedProficiency(null)).toBe(false);
    expect(assessmentMeetsTarget(null, 'BEGINNER')).toBe(false);
  });

  it('maps demonstrated levels onto claim proficiency', () => {
    expect(claimProficiencyFromDemonstrated('INTERMEDIATE')).toBe('INTERMEDIATE');
    expect(claimProficiencyFromDemonstrated('PROFICIENT')).toBe('PROFICIENT');
    expect(claimProficiencyFromDemonstrated('ADVANCED')).toBe('ADVANCED');
  });
});
