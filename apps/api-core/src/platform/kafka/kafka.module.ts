import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service.js';

@Global()
@Module({
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
