import { describe, expect, it } from 'vitest';
import {
  COGNITIVE_PROFILE_NARRATIVE_MIN,
  COGNITIVE_PROFILE_PROMPT_REF,
  CognitiveCommLlmOutputSchema,
  RefreshCognitiveProfileRequestSchema,
  RefreshCognitiveProfileResponseSchema,
} from './cognitive-profile.dto.js';

const bullets = ['Names trade-offs when choosing tools for a task.'];

const llmHappy = {
  cognitiveNarrative:
    'Works through problems by breaking them into steps and checking assumptions before deciding.'.padEnd(
      COGNITIVE_PROFILE_NARRATIVE_MIN,
      'x',
    ),
  communicationNarrative:
    'Explains work in concrete terms and asks for the decision that is needed.'.padEnd(
      COGNITIVE_PROFILE_NARRATIVE_MIN,
      'x',
    ),
  cognitiveStrengths: bullets,
  cognitiveWeaknesses: ['Jumps to implementation before stating the constraint set.'],
  communicationStrengths: ['Writes short updates that name the blocker first.'],
  communicationWeaknesses: ['Leaves out the audience when describing a technical choice.'],
  cognitiveScore: 62,
  communicationScore: 58,
};

describe('CognitiveCommLlmOutputSchema', () => {
  it('accepts a full strengths/weaknesses narrative with optional scores', () => {
    const parsed = CognitiveCommLlmOutputSchema.parse(llmHappy);
    expect(parsed.cognitiveWeaknesses).toHaveLength(1);
    expect(parsed.cognitiveScore).toBe(62);
  });

  it('rejects a narrative that is only a number-shaped empty story', () => {
    expect(
      CognitiveCommLlmOutputSchema.safeParse({
        ...llmHappy,
        cognitiveNarrative: 'too short',
      }).success,
    ).toBe(false);
  });

  it('rejects missing weaknesses so the profile cannot be praise-only', () => {
    expect(
      CognitiveCommLlmOutputSchema.safeParse({
        ...llmHappy,
        cognitiveWeaknesses: [],
      }).success,
    ).toBe(false);
  });

  it('rejects scores outside 0-100', () => {
    expect(
      CognitiveCommLlmOutputSchema.safeParse({
        ...llmHappy,
        cognitiveScore: 101,
      }).success,
    ).toBe(false);
  });
});

describe('RefreshCognitiveProfileRequestSchema', () => {
  it('defaults force to false', () => {
    expect(RefreshCognitiveProfileRequestSchema.parse({}).force).toBe(false);
    expect(RefreshCognitiveProfileRequestSchema.parse({ force: true }).force).toBe(true);
  });
});

describe('RefreshCognitiveProfileResponseSchema', () => {
  it('allows ready with a snapshot and queued without one', () => {
    expect(
      RefreshCognitiveProfileResponseSchema.parse({
        status: 'queued',
        studentId: '11111111-1111-4111-8111-111111111111',
        refreshedAt: null,
        snapshot: null,
      }).status,
    ).toBe('queued');
    expect(COGNITIVE_PROFILE_PROMPT_REF).toBe('cognitive-comm-profile@1');
  });
});
