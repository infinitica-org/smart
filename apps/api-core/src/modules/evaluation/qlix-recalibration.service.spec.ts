import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SIGNAL_WEIGHT_MODEL } from '@smart/scoring-engine';
import { QlixRecalibrationService } from './qlix-recalibration.service.js';

describe('QlixRecalibrationService', () => {
  const prisma = {
    placementRecord: { findMany: vi.fn() },
  };
  const weightModels = {
    getActiveModel: vi.fn(),
    publishModel: vi.fn(),
    saveLastReport: vi.fn(),
  };
  const audit = { record: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    weightModels.getActiveModel.mockResolvedValue(DEFAULT_SIGNAL_WEIGHT_MODEL);
  });

  it('skips publish when cohort is below minimum sample size', async () => {
    prisma.placementRecord.findMany.mockResolvedValue([
      {
        outcome: 'ACCEPTED',
        track: { code: 'TECH_FULLSTACK' },
        user: {
          projects: [
            {
              qlixCheckResult: {
                appliedProficiencyCeiling: 'ADVANCED',
                qualityScore: 82,
                authenticityScore: 78,
                relevanceScore: 80,
              },
            },
          ],
        },
      },
    ]);

    const service = new QlixRecalibrationService(
      prisma as never,
      weightModels as never,
      audit as never,
    );
    const report = await service.runBatch();

    expect(report.published).toBe(false);
    expect(weightModels.publishModel).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        action: 'score.recalibration_run',
        reasonCode: 'skipped',
        metadata: expect.objectContaining({ published: false, sampleSize: report.sampleSize }),
      }),
    );
    expect(weightModels.saveLastReport).toHaveBeenCalledWith(report);
  });

  it('publishes a trained model when enough QLIX-linked outcomes exist', async () => {
    prisma.placementRecord.findMany.mockResolvedValue(
      Array.from({ length: 120 }, (_, index) => ({
        outcome: index < 84 ? 'ACCEPTED' : 'INTERVIEWED',
        track: { code: 'TECH_FULLSTACK' },
        user: {
          projects: [
            {
              qlixCheckResult: {
                appliedProficiencyCeiling: index < 84 ? 'ADVANCED' : 'BEGINNER',
                qualityScore: index < 84 ? 88 : 42,
                authenticityScore: index < 84 ? 86 : 40,
                relevanceScore: index < 84 ? 85 : 38,
              },
            },
          ],
        },
      })),
    );

    const service = new QlixRecalibrationService(
      prisma as never,
      weightModels as never,
      audit as never,
    );
    const report = await service.runBatch();

    expect(report.published).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'score.recalibration_run',
        reasonCode: 'published',
        metadata: expect.objectContaining({
          previousWeight: report.previousWeight,
          nextWeight: report.nextWeight,
        }),
      }),
    );
    expect(weightModels.publishModel).toHaveBeenCalledWith(
      expect.objectContaining({ modelVersion: 'qlix-trained-v1' }),
    );
  });
});
