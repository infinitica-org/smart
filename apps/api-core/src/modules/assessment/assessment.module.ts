import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { EvaluationModule } from '../evaluation/evaluation.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { UsersModule } from '../users/users.module.js';
import { AssessmentAdminController } from './assessment-admin.controller.js';
import { AssessmentAdminService } from './assessment-admin.service.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { AssessmentIntelligenceService } from './assessment-intelligence.service.js';
import { AttemptResultRecalculationService } from './attempt-result-recalculation.service.js';
import { GradingAdminController } from './grading-admin.controller.js';
import { GradingAdminService } from './grading-admin.service.js';
import { IntegrityAdminController } from './integrity-admin.controller.js';
import { SkillRetakeAdminController } from './skill-retake-admin.controller.js';
import { SkillRetakeAdminService } from './skill-retake-admin.service.js';
import { ItemRotationService } from './item-rotation.service.js';
import { CertVerificationAssessmentService } from './cert-verification-assessment.service.js';
import { SkillClaimDeclareModule } from './skill-claim-declare.module.js';
import { SkillVerifyGradeProcessor } from './skill-verify-grade.processor.js';
import { SkillVerificationService } from './skill-verification.service.js';

@Module({
  imports: [
    SkillClaimDeclareModule,
    AuditModule,
    AiGatewayModule,
    EvaluationModule,
    EvidenceModule,
    StorageModule,
    UsersModule,
  ],
  controllers: [
    AssessmentController,
    IntegrityAdminController,
    AssessmentAdminController,
    GradingAdminController,
    SkillRetakeAdminController,
  ],
  providers: [
    AssessmentService,
    AssessmentAdminService,
    AttemptResultRecalculationService,
    GradingAdminService,
    SkillRetakeAdminService,
    ItemRotationService,
    SkillVerificationService,
    SkillVerifyGradeProcessor,
    CertVerificationAssessmentService,
    AssessmentIntelligenceService,
  ],
  exports: [AssessmentService, ItemRotationService, CertVerificationAssessmentService],
})
export class AssessmentModule {}
