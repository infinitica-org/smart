import { Module } from '@nestjs/common';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PublicProfileModule } from '../public-profile/public-profile.module.js';
import { ApplicationService } from './application.service.js';
import { CandidateWorkflowController } from './candidate-workflow.controller.js';
import { CandidateWorkflowService } from './candidate-workflow.service.js';
import { EmployerApplicantsController } from './employer-applicants.controller.js';
import { EmployerApplicantsService } from './employer-applicants.service.js';
import { EmployerPipelineController } from './employer-pipeline.controller.js';
import { EmployerPipelineService } from './employer-pipeline.service.js';
import { HiringService } from './hiring.service.js';
import { PipelineMetricsController } from './pipeline-metrics.controller.js';
import { PipelineMetricsService } from './pipeline-metrics.service.js';
import { ApplicationStageEventRepository } from './stage-event.repository.js';
import { EvidenceSnapshotGuard } from './evidence-snapshot.guard.js';
import { StudentApplicationsController } from './student-applications.controller.js';

@Module({
  imports: [NotificationsModule, PublicProfileModule],
  controllers: [
    StudentApplicationsController,
    EmployerApplicantsController,
    EmployerPipelineController,
    CandidateWorkflowController,
    PipelineMetricsController,
  ],
  providers: [
    ApplicationService,
    HiringService,
    ApplicationStageEventRepository,
    EmployerApplicantsService,
    EmployerPipelineService,
    CandidateWorkflowService,
    PipelineMetricsService,
    IdempotencyService,
    EvidenceSnapshotGuard,
  ],
  exports: [ApplicationService, HiringService, EvidenceSnapshotGuard],
})
export class ApplicationsModule {}
