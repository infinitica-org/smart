import { describe, expect, it, vi } from 'vitest';
import { QlixPollService } from './qlix-poll.service.js';

describe('QlixPollService', () => {
  it('skips when a verification report already exists', async () => {
    const prisma = {
      projectVerificationReport: {
        findUnique: vi.fn().mockResolvedValue({ id: 'report-1' }),
      },
    };
    const service = new QlixPollService(
      prisma as never,
      { getCheck: vi.fn() } as never,
      { markVerifyComplete: vi.fn() } as never,
      { enqueueEnvelope: vi.fn() } as never,
      { get: vi.fn() } as never,
      { add: vi.fn() } as never,
    );

    await service.handlePoll({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      checkId: 'check-1',
      startedAtMs: Date.now(),
    });

    expect(prisma.projectVerificationReport.findUnique).toHaveBeenCalled();
  });

  it('persists qlix check result and report when poll completes', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const studentId = '123e4567-e89b-12d3-a456-426614174001';
    const qlixCheckResultUpsert = vi.fn().mockResolvedValue({});
    const reportCreate = vi.fn().mockResolvedValue({});
    const projectUpdate = vi.fn().mockResolvedValue({});

    const prisma = {
      projectVerificationReport: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: reportCreate,
      },
      qlixCheckResult: { upsert: qlixCheckResultUpsert },
      project: { update: projectUpdate },
    };

    const qlix = {
      getCheck: vi.fn().mockResolvedValue({
        checkId: 'check-1',
        status: 'completed',
        similarityIndex: 12,
        aiLikelihood: 20,
        smartAssessment: {
          appliedProficiencyCeiling: 'INTERMEDIATE',
          qualityScore: 72,
          competencyObservations: [],
        },
        agentReview: { status: 'completed', verdict: { summary: 'Pass' } },
      }),
      getSkills: vi.fn().mockResolvedValue({
        totals: { analyzedTokens: 1200, analyzedFiles: 10 },
      }),
      isTerminal: vi.fn().mockReturnValue(true),
      isPublishable: vi.fn().mockReturnValue(true),
      buildDigest: vi.fn().mockReturnValue('similarityIndex=12'),
      logUnavailable: vi.fn(),
    };

    const markVerifyComplete = vi.fn().mockResolvedValue(undefined);
    const service = new QlixPollService(
      prisma as never,
      qlix as never,
      { markVerifyComplete } as never,
      { enqueueEnvelope: vi.fn() } as never,
      { get: vi.fn().mockResolvedValue(null) } as never,
      { add: vi.fn() } as never,
    );

    await service.handlePoll({
      projectId,
      studentId,
      checkId: 'check-1',
      startedAtMs: Date.now(),
    });

    expect(qlix.getSkills).toHaveBeenCalledWith('check-1');
    expect(qlixCheckResultUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId },
        create: expect.objectContaining({
          analyzedTokens: 1200,
          appliedProficiencyCeiling: 'INTERMEDIATE',
        }),
      }),
    );
    expect(reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ routedToReview: false }),
      }),
    );
    expect(projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'SUBMITTED' },
      }),
    );
    expect(markVerifyComplete).toHaveBeenCalledWith(projectId);
  });
});
