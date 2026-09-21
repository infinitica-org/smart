import { describe, expect, it } from 'vitest';
import { potentialFitLabel } from './matching-display';

describe('potentialFitLabel', () => {
  it('maps ranker bands to TPO-readable phrases', () => {
    expect(potentialFitLabel('STRONG')).toBe('Strong fit for role');
    expect(potentialFitLabel('MODERATE')).toBe('Good fit with some gaps');
    expect(potentialFitLabel('STRETCH')).toBe('Partial fit — upskilling likely');
  });
});
