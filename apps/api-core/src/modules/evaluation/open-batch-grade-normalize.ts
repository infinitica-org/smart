import type { z } from 'zod';
import type { SdeOpenBatchGradeSchema } from '@smart/prompts';

export type OpenBatchGradeParsed = z.infer<typeof SdeOpenBatchGradeSchema>;

/** LLM graders often return 0-based positions; SMART items use 1-based sealed indices. */
export function normalizeOpenBatchGradeIndices(
  parsed: OpenBatchGradeParsed,
  expectedIndices: readonly number[],
): OpenBatchGradeParsed {
  if (expectedIndices.length === 0) return parsed;

  const grades = parsed.grades.map((grade, position) => {
    const index = grade.index;
    if (expectedIndices.includes(index)) {
      return grade;
    }
    if (index >= 0 && index < expectedIndices.length) {
      const mapped = expectedIndices[index];
      if (mapped !== undefined) {
        return { ...grade, index: mapped };
      }
    }
    const positional = expectedIndices[position];
    if (positional !== undefined) {
      return { ...grade, index: positional };
    }
    return grade;
  });

  return { ...parsed, grades };
}
