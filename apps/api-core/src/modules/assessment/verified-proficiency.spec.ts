import { describe, expect, it } from 'vitest';
import { assessmentMeetsTarget, claimProficiencyFromDemonstrated } from './verified-proficiency.js';

describe('verified-proficiency', () => {
  it('maps demonstrated professional to professional on claims', () => {
    expect(claimProficiencyFromDemonstrated('PROFESSIONAL')).toBe('PROFESSIONAL');
  });

  it('maps demonstrated advanced to advanced on claims', () => {
    expect(claimProficiencyFromDemonstrated('ADVANCED')).toBe('ADVANCED');
  });

  it('preserves intermediate and beginner demonstrated levels', () => {
    expect(claimProficiencyFromDemonstrated('INTERMEDIATE')).toBe('INTERMEDIATE');
    expect(claimProficiencyFromDemonstrated('BEGINNER')).toBe('BEGINNER');
  });

  it('assessmentMeetsTarget compares supported vs declared claim', () => {
    expect(assessmentMeetsTarget('ADVANCED', 'INTERMEDIATE')).toBe(true);
    expect(assessmentMeetsTarget('BEGINNER', 'INTERMEDIATE')).toBe(false);
  });
});
