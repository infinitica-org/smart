import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { EvaluationModule } from '../evaluation/evaluation.module.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { IntegrityAdminController } from './integrity-admin.controller.js';
import { ItemRotationService } from './item-rotation.service.js';
import { CertVerificationAssessmentService } from './cert-verification-assessment.service.js';
import { SkillVerificationService } from './skill-verification.service.js';

@Module({
  imports: [AuditModule, AiGatewayModule, EvaluationModule, StorageModule],
  controllers: [AssessmentController, IntegrityAdminController],
  providers: [
    AssessmentService,
    ItemRotationService,
    SkillVerificationService,
    CertVerificationAssessmentService,
  ],
  exports: [AssessmentService, ItemRotationService, CertVerificationAssessmentService],
})
export class AssessmentModule {}
