import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { CognitiveProfileService } from './cognitive-profile.service.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';

@Module({
  imports: [AiGatewayModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, CognitiveProfileService],
  exports: [EvaluationService, CognitiveProfileService],
})
export class EvaluationModule {}
