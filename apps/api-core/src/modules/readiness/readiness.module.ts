import { Module } from '@nestjs/common';
import { ReadinessController } from './readiness.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  controllers: [ReadinessController],
  providers: [ReadinessService],
})
export class ReadinessModule {}
