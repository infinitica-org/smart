import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { EvaluationModule } from '../evaluation/evaluation.module.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { IntegrityAdminController } from './integrity-admin.controller.js';
import { ItemRotationService } from './item-rotation.service.js';
import { SkillVerificationService } from './skill-verification.service.js';

@Module({
  imports: [AuditModule, AiGatewayModule, EvaluationModule],
  controllers: [AssessmentController, IntegrityAdminController],
  providers: [AssessmentService, ItemRotationService, SkillVerificationService],
  exports: [AssessmentService, ItemRotationService],
})
export class AssessmentModule {}
