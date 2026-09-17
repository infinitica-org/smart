import { describe, expect, it } from 'vitest';
import { dashboardTimeEyebrow } from './dashboard-greeting';

describe('dashboardTimeEyebrow', () => {
  it('returns afternoon greeting for midday', () => {
    expect(dashboardTimeEyebrow(new Date('2026-09-15T14:00:00'))).toBe('Good afternoon');
  });
});
