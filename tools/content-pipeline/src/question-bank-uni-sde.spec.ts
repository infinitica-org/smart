import { describe, expect, it } from 'vitest';
import {
  QUESTION_BANK_UNI_SDE,
  augmentQuestionBankWithProficientTier,
} from './question-bank-uni-sde.js';

describe('question-bank-uni-sde', () => {
  it('includes a proficient tier when the source bank only has beginner/intermediate/advanced', () => {
    const sample = [
      {
        id: 'x1',
        stream: 'UNIVERSAL',
        skillCode: 'TEST',
        skillName: 'Test',
        level: 'INTERMEDIATE',
        format: 'MCQ',
        prompt: '[Skill - Intermediate] Sample',
        options: { A: 'a' },
        answer: 'A',
        rubric: 'r',
        reviewStatus: 'APPROVED',
      },
    ] as const;
    const augmented = augmentQuestionBankWithProficientTier(sample);
    expect(augmented.some((row) => row.level === 'PROFICIENT')).toBe(true);
    expect(QUESTION_BANK_UNI_SDE.some((row) => row.level === 'PROFICIENT')).toBe(true);
  });
});
