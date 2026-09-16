import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { GithubIntegrationModule } from '../integrations/github/github-integration.module.js';
import { ProctoringModule } from '../proctoring/proctoring.module.js';
import { SpeechModule } from '../speech/speech.module.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';
import { ProjectDefenseController } from './project-defense.controller.js';
import { ProjectDefenseService } from './project-defense.service.js';
import { ProjectInterviewGateService } from './project-interview-gate.service.js';
import { ProjectSubmittedConsumer } from './project-submitted.consumer.js';
import { ProjectVerifyRunnerService } from './project-verify-runner.service.js';
import { QlixClient } from './qlix-client.js';
import { QlixPollProcessor } from './qlix-poll.processor.js';
import { QlixPollService } from './qlix-poll.service.js';

@Module({
  imports: [AiGatewayModule, GithubIntegrationModule, ProctoringModule, SpeechModule],
  controllers: [EvaluationController, ProjectDefenseController],
  providers: [
    EvaluationService,
    ProjectDefenseService,
    ProjectInterviewGateService,
    ProjectVerifyRunnerService,
    ProjectSubmittedConsumer,
    QlixClient,
    QlixPollService,
    QlixPollProcessor,
  ],
  exports: [EvaluationService, ProjectInterviewGateService, ProjectVerifyRunnerService],
})
export class EvaluationModule {}
