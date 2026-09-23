import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { CorroborationModule } from '../corroboration/corroboration.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { GithubIntegrationModule } from '../integrations/github/github-integration.module.js';
import { ProctoringModule } from '../proctoring/proctoring.module.js';
import { SpeechModule } from '../speech/speech.module.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';
import { ProjectDefenseController } from './project-defense.controller.js';
import { ProjectDefenseRecordService } from './project-defense-record.service.js';
import { ProjectDefenseService } from './project-defense.service.js';
import { ProjectReviewAdminController } from './project-review-admin.controller.js';
import { ProjectReviewService } from './project-review.service.js';
import { ProjectInterviewGateService } from './project-interview-gate.service.js';
import { ProjectSubmittedConsumer } from './project-submitted.consumer.js';
import { ProjectVerifyRunnerService } from './project-verify-runner.service.js';
import { QlixClient } from './qlix-client.js';
import { CapabilityInferenceService } from './capability-inference.service.js';
import { ProjectVerifyCompletedConsumer } from './project-verify-completed.consumer.js';
import { QlixPollProcessor } from './qlix-poll.processor.js';
import { QlixPollService } from './qlix-poll.service.js';
import { QlixRecalibrationProcessor } from './qlix-recalibration.processor.js';
import { QlixRecalibrationService } from './qlix-recalibration.service.js';

@Module({
  imports: [
    AiGatewayModule,
    CorroborationModule,
    EvidenceModule,
    GithubIntegrationModule,
    ProctoringModule,
    SpeechModule,
  ],
  controllers: [EvaluationController, ProjectDefenseController, ProjectReviewAdminController],
  providers: [
    EvaluationService,
    ProjectDefenseService,
    ProjectDefenseRecordService,
    ProjectReviewService,
    ProjectInterviewGateService,
    ProjectVerifyRunnerService,
    ProjectSubmittedConsumer,
    ProjectVerifyCompletedConsumer,
    QlixClient,
    QlixPollService,
    QlixPollProcessor,
    CapabilityInferenceService,
    QlixRecalibrationService,
    QlixRecalibrationProcessor,
  ],
  exports: [
    EvaluationService,
    ProjectInterviewGateService,
    ProjectVerifyRunnerService,
    CapabilityInferenceService,
  ],
})
export class EvaluationModule {}
