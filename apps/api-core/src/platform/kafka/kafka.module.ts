import { Global, Module } from '@nestjs/common';
import { AssessmentSubmittedConsumer } from './assessment-submitted.consumer.js';
import { KafkaOutboxService } from './kafka-outbox.service.js';
import { KafkaService } from './kafka.service.js';

@Global()
@Module({
  providers: [KafkaService, KafkaOutboxService, AssessmentSubmittedConsumer],
  exports: [KafkaService, KafkaOutboxService],
})
export class KafkaModule {}
