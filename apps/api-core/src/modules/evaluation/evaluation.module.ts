import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';

@Module({
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
