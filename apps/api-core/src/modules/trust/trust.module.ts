import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { QueueModule } from '../../platform/queue/queue.module.js';
import { PublicProfileModule } from '../public-profile/public-profile.module.js';
import { TrustController } from './trust.controller.js';
import { TrustAppealController } from './trust-appeal.controller.js';
import { TrustReportController } from './trust-report.controller.js';
import { TrustNotificationController } from './trust-notification.controller.js';
import { TrustService } from './trust.service.js';
import { ScoreRecalculationProcessor } from './score-recalculation.processor.js';

@Module({
  imports: [QueueModule, AuditModule, forwardRef(() => PublicProfileModule)],
  controllers: [
    TrustController,
    TrustAppealController,
    TrustReportController,
    TrustNotificationController,
  ],
  providers: [TrustService, ScoreRecalculationProcessor],
  exports: [TrustService],
})
export class TrustModule {}
