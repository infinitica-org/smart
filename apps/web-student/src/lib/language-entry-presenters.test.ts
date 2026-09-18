import { describe, expect, it } from 'vitest';

import { proficiencySummary, proficiencyTier } from '@/lib/language-entry-presenters';

describe('language-entry-presenters', () => {
  it('maps proficiency to tier for progress bar', () => {
    expect(proficiencyTier('Elementary')).toBe(1);
    expect(proficiencyTier('Native or Bilingual')).toBe(5);
  });

  it('summarizes proficiency for card subtitle', () => {
    expect(proficiencySummary('Full Professional')).toBe('Full professional');
  });
});
