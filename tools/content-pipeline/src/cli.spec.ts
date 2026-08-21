import { describe, expect, it } from 'vitest';
import { TRACK_DEFINITIONS, assertDomainWeightsSumToOne } from '@smart/contracts';

describe('content pipeline', () => {
  it('accepts every published track definition', () => {
    expect(() => TRACK_DEFINITIONS.forEach(assertDomainWeightsSumToOne)).not.toThrow();
  });
});
