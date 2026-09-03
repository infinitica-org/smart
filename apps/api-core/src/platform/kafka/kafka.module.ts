import { Global, Module } from '@nestjs/common';
import { CertificateModule } from '../../modules/certificate/certificate.module.js';
import { NotificationsModule } from '../../modules/notifications/notifications.module.js';
import { WebhooksModule } from '../../modules/webhooks/webhooks.module.js';
import { AiCompletionRecordedConsumer } from './ai-completion-recorded.consumer.js';
import { ApplicationStageChangedConsumer } from './application-stage-changed.consumer.js';
import { AssessmentSubmittedConsumer } from './assessment-submitted.consumer.js';
import { AssessmentSubmittedEvalConsumer } from '../../modules/evaluation/assessment-submitted-eval.consumer.js';
import { AuditRecordedConsumer } from './audit-recorded.consumer.js';
import { EvalCompletedConsumer } from '../../modules/certificate/eval-completed.consumer.js';
import { InvitationSentConsumer } from './invitation-sent.consumer.js';
import { KafkaOutboxService } from './kafka-outbox.service.js';
import { KafkaService } from './kafka.service.js';
import { SkillVerificationCompletedConsumer } from './skill-verification-completed.consumer.js';
import { WebhookDispatchConsumer } from './webhook-dispatch.consumer.js';

@Global()
@Module({
  imports: [NotificationsModule, WebhooksModule, CertificateModule],
  providers: [
    KafkaService,
    KafkaOutboxService,
    AssessmentSubmittedConsumer,
    AssessmentSubmittedEvalConsumer,
    ApplicationStageChangedConsumer,
    InvitationSentConsumer,
    SkillVerificationCompletedConsumer,
    AuditRecordedConsumer,
    AiCompletionRecordedConsumer,
    EvalCompletedConsumer,
    WebhookDispatchConsumer,
  ],
  exports: [KafkaService, KafkaOutboxService],
})
export class KafkaModule {}
