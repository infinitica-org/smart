import { describe, expect, it } from 'vitest';
import { skillVerifyRuleItems } from './skill-verify-rules';

describe('skillVerifyRuleItems', () => {
  it('states the warning cap and in-frame requirement', () => {
    const rules = skillVerifyRuleItems(5);
    expect(rules.some((row) => /5 integrity warnings/i.test(row))).toBe(true);
    expect(rules.some((row) => /one clearly lit face/i.test(row))).toBe(true);
    expect(rules.some((row) => /second monitor/i.test(row))).toBe(true);
  });
});
