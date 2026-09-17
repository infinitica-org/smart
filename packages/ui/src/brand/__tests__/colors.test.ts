import { describe, expect, it } from 'vitest';
import { SMART_BRAND_TEAL, SMART_MARK_TEAL } from '../colors';

describe('SMART brand colors', () => {
  it('does not use legacy neon teal #00fad0', () => {
    expect(SMART_BRAND_TEAL.toLowerCase()).not.toBe('#00fad0');
    expect(SMART_MARK_TEAL.toLowerCase()).not.toBe('#00fad0');
  });

  it('exports a single canonical mark teal', () => {
    expect(SMART_MARK_TEAL).toBe(SMART_BRAND_TEAL);
    expect(SMART_BRAND_TEAL).toBe('#14b8a6');
  });
});
