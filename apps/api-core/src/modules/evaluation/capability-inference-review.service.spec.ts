import { describe, expect, it, vi } from 'vitest';
import { CapabilityInferenceReviewService } from './capability-inference-review.service.js';

const CAP_ID = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';

describe('CapabilityInferenceReviewService', () => {
  it('updates low-confidence capability and recomputes skill inference', async () => {
    const update = vi.fn().mockResolvedValue({
      id: CAP_ID,
      studentId: '11111111-1111-4111-8111-111111111111',
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      proficiency: 'INTERMEDIATE',
      confidenceScore: 0.75,
      capabilityLabel: 'Query tuning',
    });
    const skillInference = { recomputeForSkill: vi.fn().mockResolvedValue({}) };
    const service = new CapabilityInferenceReviewService(
      {
        studentCapability: {
          findUnique: vi.fn().mockResolvedValue({
            id: CAP_ID,
            studentId: '11111111-1111-4111-8111-111111111111',
            skillCode: 'SQL_QUERY_OPTIMIZATION',
            proficiency: 'BEGINNER',
            confidenceScore: 0.4,
            capabilityLabel: 'Query tuning',
          }),
          update,
        },
      } as never,
      skillInference as never,
    );

    const result = await service.correctCapability(
      CAP_ID,
      { proficiency: 'INTERMEDIATE', reviewerNote: 'Reviewer validated transcript evidence.' },
      '22222222-2222-4222-8222-222222222222',
    );

    expect(result.proficiency).toBe('INTERMEDIATE');
    expect(skillInference.recomputeForSkill).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'SQL_QUERY_OPTIMIZATION',
    );
  });
});
