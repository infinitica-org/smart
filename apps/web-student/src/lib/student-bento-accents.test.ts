import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_CARD_ACCENTS,
  EDUCATION_CARD_ACCENTS,
  LANGUAGE_CARD_ACCENTS,
  WORK_EXPERIENCE_CARD_ACCENTS,
} from './student-bento-accents';

describe('student-bento-accents', () => {
  it('uses semantic CSS variables instead of raw hex in card accents', () => {
    const samples = [
      ...CERTIFICATE_CARD_ACCENTS,
      ...EDUCATION_CARD_ACCENTS,
      ...LANGUAGE_CARD_ACCENTS,
      ...WORK_EXPERIENCE_CARD_ACCENTS,
    ];

    for (const accent of samples) {
      const serialized = JSON.stringify(accent);
      expect(serialized).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(serialized).toMatch(/var\(--student-/);
    }
  });

  it('rotates three accent palettes for list cards', () => {
    expect(CERTIFICATE_CARD_ACCENTS).toHaveLength(3);
    expect(EDUCATION_CARD_ACCENTS[0]?.marker).not.toBe(EDUCATION_CARD_ACCENTS[1]?.marker);
  });
});
