import type { Question } from '@smart/contracts';
import questionBankData from '../data/question-bank-uni-sde.json' with { type: 'json' };

export const QUESTION_BANK_UNI_SDE: readonly Question[] =
  questionBankData as unknown as readonly Question[];
