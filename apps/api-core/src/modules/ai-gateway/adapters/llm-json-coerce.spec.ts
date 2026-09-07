import { describe, expect, it } from 'vitest';
import { SdeSkillFormClosedOutputSchema, SdeSkillFormOpenOutputSchema } from '@smart/prompts';
import { coerceLlmJson } from './llm-json-coerce.js';

describe('coerceLlmJson', () => {
  it('clips overlong open prompts so Zod max length passes', () => {
    const coerced = coerceLlmJson({
      items: [
        {
          format: 'SCENARIO',
          prompt: 'x'.repeat(5_000),
          rubric: 'Name a concrete next step and why it matches the failure mode.',
          modelAnswer: 'Check saturation, then shed load.',
        },
      ],
    });
    const parsed = SdeSkillFormOpenOutputSchema.parse(coerced);
    expect(parsed.items[0]?.prompt).toHaveLength(4_000);
  });

  it('fills missing CODING examples and hidden tests', () => {
    const coerced = coerceLlmJson({
      items: [
        {
          format: 'CODING',
          prompt: 'Implement two sum for a unique-integer array.',
          rubric: 'Correct two-pointer or hash map solution with tests in mind.',
          modelAnswer: 'Use a hashmap of value to index.',
        },
      ],
    });
    const parsed = SdeSkillFormOpenOutputSchema.parse(coerced);
    expect(parsed.items[0]?.title).toBeTruthy();
    expect(parsed.items[0]?.examples?.length).toBeGreaterThanOrEqual(2);
    expect(parsed.items[0]?.hiddenTests?.length).toBeGreaterThanOrEqual(3);
  });

  it('still parses closed MCQ items after clipping options', () => {
    const coerced = coerceLlmJson({
      items: [
        {
          format: 'MCQ',
          prompt: 'Which HTTP status means created?',
          options: { A: '201', B: '200', C: '204', D: '400' },
          answer: 'A',
        },
        {
          format: 'TRACE',
          prompt: 'After i += 1, what is i if it started at 0?',
          options: { A: '0', B: '1', C: '2', D: 'undefined' },
          answer: 'B',
        },
      ],
    });
    expect(SdeSkillFormClosedOutputSchema.parse(coerced).items).toHaveLength(2);
  });
});
