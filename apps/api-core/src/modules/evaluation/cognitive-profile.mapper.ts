import {
  COGNITIVE_PROFILE_PROMPT_REF,
  CognitiveCommLlmOutputSchema,
  CognitiveProfileSnapshotSchema,
  type CognitiveCommLlmOutput,
  type CognitiveProfileSnapshot,
} from '@smart/contracts';

export function parseCognitiveCommLlmOutput(output: unknown): CognitiveCommLlmOutput {
  return CognitiveCommLlmOutputSchema.parse(output);
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function decimalToScore(value: { toString(): string } | number | null): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value.toString());
}

export function toCognitiveSnapshot(input: {
  studentId: string;
  refreshedAt: Date;
  cognitiveNarrative: string;
  communicationNarrative: string;
  cognitiveStrengths: unknown;
  cognitiveWeaknesses: unknown;
  communicationStrengths: unknown;
  communicationWeaknesses: unknown;
  cognitiveScore: { toString(): string } | number | null;
  communicationScore: { toString(): string } | number | null;
}): CognitiveProfileSnapshot {
  return CognitiveProfileSnapshotSchema.parse({
    studentId: input.studentId,
    refreshedAt: toIso(input.refreshedAt),
    promptRef: COGNITIVE_PROFILE_PROMPT_REF,
    cognitive: {
      narrative: input.cognitiveNarrative,
      strengths: input.cognitiveStrengths,
      weaknesses: input.cognitiveWeaknesses,
      score: decimalToScore(input.cognitiveScore),
    },
    communication: {
      narrative: input.communicationNarrative,
      strengths: input.communicationStrengths,
      weaknesses: input.communicationWeaknesses,
      score: decimalToScore(input.communicationScore),
    },
  });
}
