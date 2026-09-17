import { describe, expect, it } from 'vitest';
import {
  SdeOpenBatchGradeSchema,
  SdeSkillFormOpenOutputSchema,
  SdeSkillFormOpenOutputSchemaV3,
} from './sde-skill-form.js';

const scenarioItem = {
  format: 'SCENARIO' as const,
  prompt:
    'An incremental ELT job receives duplicate natural keys. How do you keep loads idempotent?',
  rubric: 'Names merge/upsert or dedupe with stable keys and late-arriving facts.',
  modelAnswer: 'Upsert on natural key with merge semantics for updates.',
};

describe('SdeSkillFormOpenOutputSchema gateway bounds', () => {
  it('accepts up to six open items (models often over-generate before orderOpen trims)', () => {
    const items = Array.from({ length: 6 }, () => ({ ...scenarioItem }));
    expect(SdeSkillFormOpenOutputSchema.safeParse({ items }).success).toBe(true);
    const v3Items = items.map((item, idx) => ({
      ...item,
      competencySlot: `C${String((idx % 6) + 1)}` as const,
    }));
    expect(SdeSkillFormOpenOutputSchemaV3.safeParse({ items: v3Items }).success).toBe(true);
  });

  it('rejects more than six open items so the gateway fails fast with a clear schema error', () => {
    const items = Array.from({ length: 7 }, () => ({ ...scenarioItem }));
    expect(SdeSkillFormOpenOutputSchema.safeParse({ items }).success).toBe(false);
  });
});

describe('SdeOpenBatchGradeSchema index guardrails', () => {
  it('accepts 0-based grader indices before api-core maps them to sealed item indices', () => {
    const parsed = SdeOpenBatchGradeSchema.safeParse({
      grades: [
        {
          index: 0,
          marksAwarded: 8,
          justification: 'Strong idempotent pipeline design with clear dedupe semantics.',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
