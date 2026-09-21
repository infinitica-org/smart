import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeProctoringSnapshot } from './cv-client.js';

describe('analyzeProctoringSnapshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty violations in stub provider mode', async () => {
    const result = await analyzeProctoringSnapshot('proctoring/attempt/frame.jpg');
    expect(result.violations).toEqual([]);
  });
});
