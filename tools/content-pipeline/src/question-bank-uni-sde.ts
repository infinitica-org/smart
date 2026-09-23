import type { Question } from '@smart/contracts';
import questionBankData from '../data/question-bank-uni-sde.json' with { type: 'json' };

/** Until INF-06 ships native Proficient-tier stems, clone Intermediate items. */
export function augmentQuestionBankWithProficientTier(
  questions: readonly Question[],
): readonly Question[] {
  if (questions.some((row) => row.level === 'PROFICIENT')) {
    return questions;
  }
  const clones = questions
    .filter((row) => row.level === 'INTERMEDIATE')
    .map((row) => ({
      ...row,
      id: `${row.id}-PROFICIENT`,
      level: 'PROFICIENT' as const,
      prompt: row.prompt.replace(/\bIntermediate\b/g, 'Proficient'),
    }));
  return [...questions, ...clones];
}

export const QUESTION_BANK_UNI_SDE: readonly Question[] = augmentQuestionBankWithProficientTier(
  questionBankData as unknown as readonly Question[],
);
