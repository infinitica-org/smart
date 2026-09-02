import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';
import { ProjectReviewAdminController } from './project-review.controller.js';
import { ProjectVerifyService } from './project-verify.service.js';
import { ProjectsController } from './projects.controller.js';

@Module({
  imports: [AiGatewayModule],
  controllers: [EvaluationController, ProjectsController, ProjectReviewAdminController],
  providers: [EvaluationService, ProjectVerifyService],
  exports: [EvaluationService, ProjectVerifyService],
})
export class EvaluationModule {}
