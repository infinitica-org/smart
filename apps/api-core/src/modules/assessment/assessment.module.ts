import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { IntegrityAdminController } from './integrity-admin.controller.js';
import { ItemRotationService } from './item-rotation.service.js';

@Module({
  imports: [AiGatewayModule],
  controllers: [AssessmentController, IntegrityAdminController],
  providers: [AssessmentService, ItemRotationService],
  exports: [AssessmentService, ItemRotationService],
})
export class AssessmentModule {}
