import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { env } from '../../platform/config/env.js';
import { ProctoringService } from './proctoring.service.js';

@Injectable()
export class ProctoringHeartbeatJob implements OnModuleInit {
  private readonly logger = new Logger(ProctoringHeartbeatJob.name);

  constructor(@Inject(ProctoringService) private readonly proctoring: ProctoringService) {}

  onModuleInit(): void {
    if (env.NODE_ENV === 'test' || !env.PROCTORING_FULL) return;
    const timer = setInterval(() => {
      void this.proctoring.sweepStaleHeartbeats().catch((error: unknown) => {
        this.logger.warn(error instanceof Error ? error.message : 'heartbeat sweep failed');
      });
    }, 10_000);
    timer.unref();
  }
}
