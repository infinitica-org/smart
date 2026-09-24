import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SCORE_RECALCULATION_QUEUE } from '../../platform/queue/queue.names.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PublicProfileService } from '../public-profile/public-profile.service.js';

export interface ScoreRecalculationJobData {
  candidateId: string;
  reason: string;
  enforcementActionId?: string;
}

@Injectable()
@Processor(SCORE_RECALCULATION_QUEUE)
export class ScoreRecalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoreRecalculationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicProfileService: PublicProfileService,
  ) {
    super();
  }

  async process(job: Job<ScoreRecalculationJobData>): Promise<void> {
    const { candidateId, reason } = job.data;
    this.logger.log(`Processing score recalculation for candidate ${candidateId}: ${reason}`);

    // 1. Recheck public profile activation state after enforcement / recalculation
    await this.publicProfileService.recheckActivationAfterVoid(candidateId);

    // 2. Fetch active sanctions and holds for audit logging
    const activeHolds = await this.prisma.userAccountHold.findMany({
      where: { userId: candidateId, liftedAt: null },
    });

    const activeSanctions = await this.prisma.enforcementAction.findMany({
      where: { candidateId, status: 'ACTIVE' },
    });

    this.logger.log(
      `Candidate ${candidateId} recalculated successfully: ${activeHolds.length} active holds, ${activeSanctions.length} active sanctions.`,
    );
  }
}
