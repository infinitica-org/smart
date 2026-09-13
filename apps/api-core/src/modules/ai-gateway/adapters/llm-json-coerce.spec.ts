import { describe, expect, it } from 'vitest';
import {
  SdeSkillFormClosedOutputSchema,
  SdeSkillFormOpenOutputSchema,
  SdeSkillFormOpenOutputSchemaV3,
} from '@smart/prompts';
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

  it('accepts alternate example field names on CODING items', () => {
    const coerced = coerceLlmJson({
      items: [
        {
          format: 'CODING',
          competencySlot: 'C2',
          prompt: 'Implement a rate limiter with a sliding window.',
          rubric: 'Correct window eviction and request counting.',
          modelAnswer: 'Use a deque of timestamps and trim expired entries.',
          visibleExamples: [{ input: '[1,2,3]', output: '6' }],
        },
      ],
    });
    const parsed = SdeSkillFormOpenOutputSchemaV3.parse(coerced);
    expect(parsed.items[0]?.examples?.length).toBeGreaterThanOrEqual(2);
  });

  it('preserves competencySlot on v3 open items while filling CODING examples', () => {
    const coerced = coerceLlmJson({
      items: [
        {
          format: 'CODING',
          competencySlot: 'C3',
          prompt: 'Write a function that reverses a linked list in place.',
          rubric: 'Correct iterative reversal with O(1) extra space.',
          modelAnswer: 'Track prev, curr, next pointers while rewiring links.',
        },
      ],
    });
    const parsed = SdeSkillFormOpenOutputSchemaV3.parse(coerced);
    expect(parsed.items[0]?.competencySlot).toBe('C3');
    expect(parsed.items[0]?.examples?.length).toBeGreaterThanOrEqual(2);
    expect(parsed.items[0]?.hiddenTests?.length).toBeGreaterThanOrEqual(3);
  });

  it('normalizes scenario format aliases before Zod parse', () => {
    const coerced = coerceLlmJson({
      items: [
        {
          format: 'scenario',
          prompt: 'A model registry deploy fails during canary; what do you check first?',
          rubric: 'Names rollback, metrics, or registry state with a concrete next step.',
          modelAnswer:
            'Compare canary metrics to baseline and pause promotion if error rate spikes.',
        },
      ],
    });
    const parsed = SdeSkillFormOpenOutputSchema.parse(coerced);
    expect(parsed.items[0]?.format).toBe('SCENARIO');
  });

  it('wraps bare item arrays and alternate root keys', () => {
    const coerced = coerceLlmJson([
      {
        format: 'SCENARIO',
        prompt: 'A service is failing after deploy; what do you check first?',
        rubric: 'Names rollback, logs, or health checks with a concrete next step.',
        modelAnswer: 'Check health endpoints and recent deploy diff.',
      },
    ]);
    const parsed = SdeSkillFormOpenOutputSchema.parse(coerced);
    expect(parsed.items).toHaveLength(1);
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
