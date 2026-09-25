import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  buildRecalibratedWeightModel,
  isPositivePlacementOutcome,
  normalizeUnitScore,
  proficiencyCeilingToScore,
  type QlixRecalibrationReport,
  type QlixRecalibrationSample,
} from '@smart/scoring-engine';
import { qlixRecalibrationRuns, qlixRecalibrationWeightVersion } from '@smart/observability';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SignalWeightModelStore } from '../corroboration/signal-weight-model.store.js';

@Injectable()
export class QlixRecalibrationService {
  private readonly logger = new Logger(QlixRecalibrationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SignalWeightModelStore) private readonly weightModels: SignalWeightModelStore,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async runBatch(): Promise<QlixRecalibrationReport> {
    const samples = await this.loadSamples();
    const current = await this.weightModels.getActiveModel();
    const { model, report } = buildRecalibratedWeightModel(current, samples);

    if (report.published) {
      await this.weightModels.publishModel(model);
      qlixRecalibrationWeightVersion.set(
        { predictor: report.predictor },
        Number.parseFloat(model.weightsBySourceAndDimension.QLIX?.default?.toFixed(4) ?? '0'),
      );
    }

    await this.weightModels.saveLastReport(report);
    qlixRecalibrationRuns.inc({ published: report.published ? 'true' : 'false' });
    // S6-VV-102 (#492) — one summary row per run (not one per affected score).
    await this.auditPublisher.record({
      actorId: null,
      action: 'score.recalibration_run',
      resourceType: 'SignalWeightModel',
      resourceId: null,
      reasonCode: report.published ? 'published' : 'skipped',
      metadata: {
        predictor: report.predictor,
        sampleSize: report.sampleSize,
        correlation: report.correlation,
        auc: report.auc,
        previousWeight: report.previousWeight,
        nextWeight: report.nextWeight,
        published: report.published,
        message: report.reason,
      },
    });

    this.logger.log(
      `QLIX recalibration ${report.published ? 'published' : 'skipped'}: ${report.reason}`,
    );
    return report;
  }

  async getLastReport(): Promise<QlixRecalibrationReport | null> {
    return this.weightModels.getLastReport<QlixRecalibrationReport>();
  }

  private async loadSamples(): Promise<QlixRecalibrationSample[]> {
    const records = await this.prisma.placementRecord.findMany({
      include: {
        track: { select: { code: true } },
        user: {
          select: {
            projects: {
              include: {
                qlixCheckResult: {
                  select: {
                    appliedProficiencyCeiling: true,
                    qualityScore: true,
                    authenticityScore: true,
                    relevanceScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const samples: QlixRecalibrationSample[] = [];
    for (const record of records) {
      const qlixRows = record.user.projects
        .map((project) => project.qlixCheckResult)
        .filter((row): row is NonNullable<typeof row> => row != null);
      if (qlixRows.length === 0) continue;

      const best = qlixRows.reduce<(typeof qlixRows)[number] | null>((acc, row) => {
        if (!acc) return row;
        const accScore = acc.qualityScore ?? 0;
        const rowScore = row.qualityScore ?? 0;
        return rowScore > accScore ? row : acc;
      }, null);
      if (!best) continue;

      samples.push({
        trackCode: record.track.code,
        positiveOutcome: isPositivePlacementOutcome(record.outcome),
        proficiencyCeilingScore: proficiencyCeilingToScore(best.appliedProficiencyCeiling),
        qualityScore: normalizeUnitScore(best.qualityScore),
        authenticityScore: normalizeUnitScore(best.authenticityScore),
        relevanceScore: normalizeUnitScore(best.relevanceScore),
      });
    }
    return samples;
  }
}
