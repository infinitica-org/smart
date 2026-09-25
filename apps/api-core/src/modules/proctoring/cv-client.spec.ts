import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeProctoringSnapshot, coerceViolations } from './cv-client.js';

describe('analyzeProctoringSnapshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty violations in stub provider mode', async () => {
    const result = await analyzeProctoringSnapshot('proctoring/attempt/frame.jpg');
    expect(result.violations).toEqual([]);
  });

  it('SEC-02 / I565: filters out prohibited emotion, expression, stress and personality inferences', () => {
    const rawSignals = [
      'EMOTION',
      'EXPRESSION',
      'PERSONALITY',
      'STRESS_LEVEL',
      'DECEPTION_DETECTION',
      'LOOKING_AWAY',
      'MULTIPLE_FACES',
    ];

    const violations = coerceViolations(rawSignals);

    // Permissible physical presence violations remain
    expect(violations).toContain('LOOKING_AWAY');
    expect(violations).toContain('MULTIPLE_FACES');

    // Prohibited emotion/expression inferences are strictly stripped
    expect(violations).not.toContain('EMOTION');
    expect(violations).not.toContain('EXPRESSION');
    expect(violations).not.toContain('PERSONALITY');
    expect(violations).not.toContain('STRESS_LEVEL');
    expect(violations).not.toContain('DECEPTION_DETECTION');
  });
});
