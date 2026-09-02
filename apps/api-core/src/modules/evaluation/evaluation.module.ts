import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';

@Module({
  imports: [AiGatewayModule],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
